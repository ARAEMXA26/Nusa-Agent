"""Task management API routes."""

import json
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from nusa.db.connection import get_db
from nusa.core.orchestrator import orchestrator

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreateRequest(BaseModel):
    project_id: str
    goal: str
    title: str | None = None


class SteerRequest(BaseModel):
    message: str


class CancelRequest(BaseModel):
    reason: str = "Cancelled by user"


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: str


class ToolCallResponse(BaseModel):
    id: str
    tool_name: str
    arguments: dict
    result: dict | None = None
    status: str
    duration_ms: int | None = None
    created_at: str


class TaskDetailResponse(BaseModel):
    id: str
    project_id: str
    title: str
    goal: str
    status: str
    created_at: str
    updated_at: str
    messages: list[MessageResponse] = []
    tool_calls: list[ToolCallResponse] = []


@router.post("", response_model=TaskDetailResponse)
async def create_task(req: TaskCreateRequest):
    with get_db() as db:
        proj = db.execute("SELECT * FROM projects WHERE id = ?", (req.project_id,)).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found")

        task_id = str(uuid.uuid4())
        title = req.title or (req.goal[:40] + "..." if len(req.goal) > 40 else req.goal)
        db.execute(
            """
            INSERT INTO tasks (id, project_id, title, goal, status)
            VALUES (?, ?, ?, ?, 'queued')
            """,
            (task_id, req.project_id, title, req.goal),
        )

    # Launch orchestrator
    await orchestrator.start_task(task_id)

    return get_task_details(task_id)


@router.get("", response_model=list[dict])
def list_tasks(project_id: str | None = None):
    with get_db() as db:
        if project_id:
            rows = db.execute(
                "SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC", (project_id,)
            ).fetchall()
        else:
            rows = db.execute("SELECT * FROM tasks ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


@router.get("/{task_id}", response_model=TaskDetailResponse)
def get_task_details(task_id: str):
    with get_db() as db:
        task_row = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not task_row:
            raise HTTPException(status_code=404, detail="Task not found")

        msg_rows = db.execute(
            "SELECT * FROM messages WHERE task_id = ? ORDER BY created_at ASC", (task_id,)
        ).fetchall()
        tc_rows = db.execute(
            "SELECT * FROM tool_calls WHERE task_id = ? ORDER BY created_at ASC", (task_id,)
        ).fetchall()

        messages = [
            MessageResponse(
                id=m["id"],
                role=m["role"],
                content=m["content"],
                created_at=str(m["created_at"]),
            )
            for m in msg_rows
        ]

        tool_calls = []
        for tc in tc_rows:
            args = {}
            res = None
            try:
                args = json.loads(tc["arguments_json"])
            except Exception:
                pass
            if tc["result_json"]:
                try:
                    res = json.loads(tc["result_json"])
                except Exception:
                    pass
            tool_calls.append(
                ToolCallResponse(
                    id=tc["id"],
                    tool_name=tc["tool_name"],
                    arguments=args,
                    result=res,
                    status=tc["status"],
                    duration_ms=tc["duration_ms"],
                    created_at=str(tc["created_at"]),
                )
            )

        return TaskDetailResponse(
            id=task_row["id"],
            project_id=task_row["project_id"],
            title=task_row["title"],
            goal=task_row["goal"],
            status=task_row["status"],
            created_at=str(task_row["created_at"]),
            updated_at=str(task_row["updated_at"]),
            messages=messages,
            tool_calls=tool_calls,
        )


@router.post("/{task_id}/steer")
async def steer_task(task_id: str, req: SteerRequest):
    await orchestrator.steer_task(task_id, req.message)
    return {"status": "ok", "message": "Steering message queued"}


@router.post("/{task_id}/cancel")
async def cancel_task(task_id: str, req: CancelRequest):
    await orchestrator.cancel_task(task_id, req.reason)
    return {"status": "ok", "message": "Task cancelled"}
