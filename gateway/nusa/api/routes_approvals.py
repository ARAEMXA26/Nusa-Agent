"""Approvals API routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from nusa.db.connection import get_db
from nusa.core.orchestrator import orchestrator

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


class ApprovalResponseItem(BaseModel):
    id: str
    task_id: str
    tool_call_id: str
    action_type: str
    description: str
    payload_preview: str
    status: str
    decided_at: str | None = None
    decided_by: str | None = None


class ApprovalDecisionRequest(BaseModel):
    decision: str  # approved or rejected


@router.get("", response_model=list[ApprovalResponseItem])
def list_approvals(status: str | None = None):
    with get_db() as db:
        if status:
            rows = db.execute(
                "SELECT * FROM approvals WHERE status = ? ORDER BY id DESC", (status,)
            ).fetchall()
        else:
            rows = db.execute("SELECT * FROM approvals ORDER BY id DESC").fetchall()

        return [
            ApprovalResponseItem(
                id=r["id"],
                task_id=r["task_id"],
                tool_call_id=r["tool_call_id"],
                action_type=r["action_type"],
                description=r["description"],
                payload_preview=r["payload_preview"],
                status=r["status"],
                decided_at=str(r["decided_at"]) if r["decided_at"] else None,
                decided_by=r["decided_by"],
            )
            for r in rows
        ]


@router.post("/{approval_id}/respond")
def respond_approval(approval_id: str, req: ApprovalDecisionRequest):
    if req.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Decision must be 'approved' or 'rejected'")

    success = orchestrator.resolve_approval(approval_id, req.decision)
    if not success:
        # Check if approval exists in db anyway
        with get_db() as db:
            row = db.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Approval request not found")
            db.execute(
                "UPDATE approvals SET status = ?, decided_at = CURRENT_TIMESTAMP WHERE id = ?",
                (req.decision, approval_id),
            )

    return {"status": "ok", "decision": req.decision}
