"""Project management API routes."""

import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from nusa.db.connection import get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreateRequest(BaseModel):
    name: str
    root_path: str
    default_model: str | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    root_path: str
    default_model: str | None = None
    created_at: str
    updated_at: str


@router.post("", response_model=ProjectResponse)
def create_project(req: ProjectCreateRequest):
    p = Path(req.root_path).expanduser().resolve()
    if not p.exists():
        p.mkdir(parents=True, exist_ok=True)

    proj_id = str(uuid.uuid4())
    with get_db() as db:
        # Check if root path already registered
        existing = db.execute(
            "SELECT * FROM projects WHERE root_path = ?", (str(p),)
        ).fetchone()
        if existing:
            return ProjectResponse(
                id=existing["id"],
                name=existing["name"],
                root_path=existing["root_path"],
                default_model=existing["default_model"],
                created_at=str(existing["created_at"]),
                updated_at=str(existing["updated_at"]),
            )

        db.execute(
            """
            INSERT INTO projects (id, name, root_path, default_model)
            VALUES (?, ?, ?, ?)
            """,
            (proj_id, req.name, str(p), req.default_model or "deterministic"),
        )
        row = db.execute("SELECT * FROM projects WHERE id = ?", (proj_id,)).fetchone()
        return ProjectResponse(
            id=row["id"],
            name=row["name"],
            root_path=row["root_path"],
            default_model=row["default_model"],
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )


@router.get("", response_model=list[ProjectResponse])
def list_projects():
    with get_db() as db:
        rows = db.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
        return [
            ProjectResponse(
                id=r["id"],
                name=r["name"],
                root_path=r["root_path"],
                default_model=r["default_model"],
                created_at=str(r["created_at"]),
                updated_at=str(r["updated_at"]),
            )
            for r in rows
        ]


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str):
    with get_db() as db:
        row = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        return ProjectResponse(
            id=row["id"],
            name=row["name"],
            root_path=row["root_path"],
            default_model=row["default_model"],
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )
