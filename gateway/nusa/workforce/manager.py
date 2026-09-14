"""Workforce Manager coordinating parallel DAG subtask execution, worktrees, and events."""

import asyncio
import json
import logging
from pathlib import Path
from typing import Any
from nusa.workforce.dag import TaskDAG, SubtaskNode, SubtaskStatus
from nusa.workforce.roles import AgentRole
from nusa.workforce.subagent import SubAgent
from nusa.security.worktree import WorktreeManager
from nusa.core.events import event_bus
from nusa.db.connection import get_db

logger = logging.getLogger(__name__)


class WorkforceManager:
    """Coordinates Multi-Agent Workforce, DAG dependency resolution, and Worktrees."""

    def __init__(self):
        self._active_dags: dict[str, TaskDAG] = {}
        self._running_tasks: dict[str, set[asyncio.Task[Any]]] = {}

    def get_dag(self, parent_task_id: str) -> TaskDAG | None:
        return self._active_dags.get(parent_task_id)

    def register_dag(self, dag: TaskDAG) -> None:
        self._active_dags[dag.parent_task_id] = dag
        self._save_dag_to_db(dag)

    def _save_dag_to_db(self, dag: TaskDAG) -> None:
        with get_db() as db:
            for node in dag.nodes.values():
                db.execute(
                    """
                    INSERT INTO subtasks (id, parent_task_id, role, title, goal, dependencies_json, status, depth, result_summary, error, created_at, completed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        status = excluded.status,
                        result_summary = excluded.result_summary,
                        error = excluded.error,
                        completed_at = excluded.completed_at
                    """,
                    (
                        node.id,
                        node.parent_task_id,
                        node.role.value,
                        node.title,
                        node.goal,
                        json.dumps(node.dependencies),
                        node.status.value,
                        node.depth,
                        node.result_summary,
                        node.error,
                        node.created_at,
                        node.completed_at,
                    ),
                )

    async def execute_dag(
        self,
        dag: TaskDAG,
        workspace_root: str,
        model_name: str | None = None,
        use_worktree_isolation: bool = True,
    ) -> dict[str, Any]:
        """Executes DAG frontier batches in parallel until completion or failure."""
        self.register_dag(dag)
        parent_id = dag.parent_task_id
        self._running_tasks[parent_id] = set()
        repo_path = Path(workspace_root)
        is_git = await WorktreeManager.is_git_repo(repo_path)

        worktree_path: Path | None = None
        wt_branch = f"nusa-sub-{parent_id[:8]}"

        # Setup Git Worktree isolation if workspace is a git repo
        if is_git and use_worktree_isolation:
            try:
                worktree_path = await WorktreeManager.create_worktree(repo_path, wt_branch)
                await event_bus.emit(
                    "worktree.created",
                    parent_id,
                    {"branch": wt_branch, "worktree_path": str(worktree_path)},
                )
            except Exception as e:
                logger.warning(f"Could not create git worktree: {e}. Falling back to main workspace.")
                worktree_path = None

        try:
            while not dag.is_terminated():
                executable = dag.get_executable_nodes()
                if not executable:
                    # No nodes ready and DAG not completed -> deadlocked or failed
                    break

                # Prepare concurrent execution batch
                tasks_to_run = []
                for node in executable:
                    dag.mark_running(node.id)
                    self._save_dag_to_db(dag)
                    await event_bus.emit(
                        "subtask.state_changed",
                        parent_id,
                        {"subtask_id": node.id, "old_state": SubtaskStatus.PENDING.value, "new_state": SubtaskStatus.RUNNING.value, "role": node.role.value},
                    )

                    # Determine working directory for this sub-agent
                    effective_root = str(worktree_path) if (worktree_path and node.role == AgentRole.CODER) else workspace_root
                    subagent = SubAgent(node, effective_root, model_name=model_name)

                    async def _run_subtask(sa: SubAgent, n: SubtaskNode) -> tuple[SubtaskNode, Any]:
                        res = await sa.run()
                        return n, res

                    t = asyncio.create_task(_run_subtask(subagent, node))
                    self._running_tasks[parent_id].add(t)
                    tasks_to_run.append(t)

                # Wait for batch completion
                results = await asyncio.gather(*tasks_to_run, return_exceptions=True)

                for res in results:
                    if isinstance(res, BaseException):
                        logger.error(f"Subtask execution raised exception: {res}")
                        continue

                    node, sub_res = res
                    summary = sub_res.get("summary", "Subtask completed.")
                    dag.mark_completed(node.id, summary)
                    self._save_dag_to_db(dag)

                    await event_bus.emit(
                        "subtask.completed",
                        parent_id,
                        {
                            "subtask_id": node.id,
                            "role": node.role.value,
                            "summary": summary,
                        },
                    )
                    await event_bus.emit(
                        "subtask.state_changed",
                        parent_id,
                        {"subtask_id": node.id, "old_state": SubtaskStatus.RUNNING.value, "new_state": SubtaskStatus.COMPLETED.value, "role": node.role.value},
                    )

            # Check if all completed
            if dag.is_all_completed():
                # If worktree was used and everything succeeded, merge back to main branch
                if worktree_path and is_git:
                    merge_res = await WorktreeManager.merge_worktree(repo_path, wt_branch)
                    if merge_res["success"]:
                        await event_bus.emit(
                            "worktree.merged",
                            parent_id,
                            {"branch": wt_branch, "target_branch": "main"},
                        )
                    await WorktreeManager.cleanup_worktree(repo_path, worktree_path, wt_branch)

                return {
                    "success": True,
                    "dag": dag.to_dict(),
                }
            else:
                return {
                    "success": False,
                    "error": "One or more subtasks failed or were blocked.",
                    "dag": dag.to_dict(),
                }

        finally:
            if worktree_path and worktree_path.exists():
                await WorktreeManager.cleanup_worktree(repo_path, worktree_path, wt_branch)
            self._running_tasks.pop(parent_id, None)

    async def cancel_dag(self, parent_task_id: str) -> None:
        """Cancels all active subtasks for the parent task."""
        tasks = self._running_tasks.get(parent_task_id, set())
        for t in list(tasks):
            if not t.done():
                t.cancel()

        dag = self._active_dags.get(parent_task_id)
        if dag:
            dag.cancel_all_pending()
            self._save_dag_to_db(dag)


# Global Singleton
workforce_manager = WorkforceManager()
