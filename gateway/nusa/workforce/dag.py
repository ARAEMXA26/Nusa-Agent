"""Directed Acyclic Graph (DAG) for Parallel Task Decomposition and Dependency Tracking."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field
from nusa.workforce.roles import AgentRole


class SubtaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"
    CANCELLED = "cancelled"


class SubtaskNode(BaseModel):
    id: str
    parent_task_id: str
    role: AgentRole
    title: str
    goal: str
    dependencies: list[str] = Field(default_factory=list)
    status: SubtaskStatus = SubtaskStatus.PENDING
    depth: int = 1
    result_summary: str | None = None
    error: str | None = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: str | None = None


class TaskDAG:
    """Manages the lifecycle, cycle validation, and parallel execution frontier of subtasks."""

    def __init__(self, parent_task_id: str):
        self.parent_task_id = parent_task_id
        self.nodes: dict[str, SubtaskNode] = {}

    def add_node(self, node: SubtaskNode) -> None:
        if node.id in self.nodes:
            raise ValueError(f"Node '{node.id}' already exists in DAG.")
        if node.depth > 3:
            raise ValueError(f"Subtask depth limit exceeded (depth={node.depth}, max=3).")

        self.nodes[node.id] = node
        self.validate_dag()

    def validate_dag(self) -> None:
        """Validates that all dependencies exist and there are no cycles."""
        for nid, node in self.nodes.items():
            for dep in node.dependencies:
                if dep not in self.nodes:
                    raise ValueError(f"Dependency '{dep}' of node '{nid}' not found in DAG.")

        # Cycle detection using DFS
        visited: set[str] = set()
        rec_stack: set[str] = set()

        def dfs(curr: str) -> bool:
            visited.add(curr)
            rec_stack.add(curr)
            for dep in self.nodes[curr].dependencies:
                if dep not in visited:
                    if dfs(dep):
                        return True
                elif dep in rec_stack:
                    return True
            rec_stack.remove(curr)
            return False

        for nid in self.nodes:
            if nid not in visited:
                if dfs(nid):
                    raise ValueError(f"Cycle detected in DAG involving node '{nid}'.")

    def get_executable_nodes(self) -> list[SubtaskNode]:
        """Returns all pending nodes whose dependencies are all completed."""
        ready: list[SubtaskNode] = []
        for node in self.nodes.values():
            if node.status != SubtaskStatus.PENDING:
                continue

            deps_met = all(
                self.nodes[dep].status == SubtaskStatus.COMPLETED
                for dep in node.dependencies
            )
            if deps_met:
                ready.append(node)
        return ready

    def mark_running(self, node_id: str) -> None:
        if node_id in self.nodes:
            self.nodes[node_id].status = SubtaskStatus.RUNNING

    def mark_completed(self, node_id: str, summary: str) -> None:
        if node_id in self.nodes:
            node = self.nodes[node_id]
            node.status = SubtaskStatus.COMPLETED
            node.result_summary = summary
            node.completed_at = datetime.now(timezone.utc).isoformat()

    def mark_failed(self, node_id: str, error: str) -> None:
        if node_id in self.nodes:
            node = self.nodes[node_id]
            node.status = SubtaskStatus.FAILED
            node.error = error
            node.completed_at = datetime.now(timezone.utc).isoformat()

            # Cascade: mark downstream nodes as blocked
            self._cascade_blocked(node_id)

    def _cascade_blocked(self, failed_node_id: str) -> None:
        for node in self.nodes.values():
            if node.status == SubtaskStatus.PENDING and failed_node_id in node.dependencies:
                node.status = SubtaskStatus.BLOCKED
                node.error = f"Blocked by dependency failure: {failed_node_id}"
                node.completed_at = datetime.now(timezone.utc).isoformat()
                self._cascade_blocked(node.id)

    def mark_cancelled(self, node_id: str) -> None:
        if node_id in self.nodes:
            node = self.nodes[node_id]
            node.status = SubtaskStatus.CANCELLED
            node.completed_at = datetime.now(timezone.utc).isoformat()

    def cancel_all_pending(self) -> None:
        for node in self.nodes.values():
            if node.status in (SubtaskStatus.PENDING, SubtaskStatus.RUNNING):
                node.status = SubtaskStatus.CANCELLED
                node.completed_at = datetime.now(timezone.utc).isoformat()

    def is_all_completed(self) -> bool:
        if not self.nodes:
            return False
        return all(n.status == SubtaskStatus.COMPLETED for n in self.nodes.values())

    def is_terminated(self) -> bool:
        if not self.nodes:
            return True
        return all(
            n.status in (
                SubtaskStatus.COMPLETED,
                SubtaskStatus.FAILED,
                SubtaskStatus.BLOCKED,
                SubtaskStatus.CANCELLED,
            )
            for n in self.nodes.values()
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "parent_task_id": self.parent_task_id,
            "nodes": [node.model_dump() for node in self.nodes.values()],
            "is_completed": self.is_all_completed(),
            "is_terminated": self.is_terminated(),
        }
