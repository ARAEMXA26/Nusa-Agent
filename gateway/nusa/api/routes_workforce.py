"""API routes for Multi-Agent Workforce, DAG inspection, and Worktree orchestration."""

import asyncio
from typing import Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from nusa.db.connection import get_db
from nusa.workforce.dag import TaskDAG, SubtaskNode
from nusa.workforce.planner import WorkforcePlanner
from nusa.workforce.manager import workforce_manager

router = APIRouter(prefix="/api/tasks/{task_id}/dag", tags=["workforce"])


class CreateDAGRequest(BaseModel):
    custom_nodes: list[dict[str, Any]] | None = None
    use_worktree: bool = True


@router.get("")
async def get_task_dag(task_id: str):
    """Get DAG execution state for a task."""
    dag = workforce_manager.get_dag(task_id)
    if dag:
        return dag.to_dict()

    # If not in memory, query from SQLite
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM subtasks WHERE parent_task_id = ? ORDER BY created_at ASC",
            (task_id,),
        ).fetchall()

    if not rows:
        return {"parent_task_id": task_id, "nodes": [], "is_completed": False, "is_terminated": False}

    nodes = [dict(r) for r in rows]
    return {
        "parent_task_id": task_id,
        "nodes": nodes,
        "is_completed": all(n["status"] == "completed" for n in nodes),
        "is_terminated": all(n["status"] in ("completed", "failed", "blocked", "cancelled") for n in nodes),
    }


@router.post("/plan")
async def plan_and_execute_dag(
    task_id: str,
    req: CreateDAGRequest,
):
    """Plan and launch a multi-agent workforce DAG for the given task."""
    with get_db() as db:
        task = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        project = db.execute("SELECT * FROM projects WHERE id = ?", (task["project_id"],)).fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    workspace_root = project["root_path"]
    model_name = project["default_model"]
    goal = task["goal"]

    if req.custom_nodes:
        dag = TaskDAG(parent_task_id=task_id)
        for n in req.custom_nodes:
            dag.add_node(SubtaskNode(**n))
    else:
        dag = WorkforcePlanner.generate_standard_dag(parent_task_id=task_id, goal=goal)

    workforce_manager.register_dag(dag)

    async def _runner():
        await workforce_manager.execute_dag(
            dag=dag,
            workspace_root=workspace_root,
            model_name=model_name,
            use_worktree_isolation=req.use_worktree,
        )

    asyncio.create_task(_runner())

    return {
        "message": "Workforce DAG pipeline scheduled",
        "parent_task_id": task_id,
        "dag": dag.to_dict(),
    }


@router.post("/cancel")
async def cancel_dag_execution(task_id: str):
    """Cancel in-flight subagents and pending DAG nodes."""
    await workforce_manager.cancel_dag(task_id)
    return {"message": "Workforce DAG cancellation requested", "task_id": task_id}
