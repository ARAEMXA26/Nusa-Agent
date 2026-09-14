"""Artifact Manager for storing, retrieving, and verifying artifacts."""

import uuid
from typing import Any
from pydantic import BaseModel
from nusa.db.connection import get_db


class ArtifactModel(BaseModel):
    id: str
    task_id: str
    title: str
    type: str  # diff, file, plan, test_report, json
    content: str
    source_path: str | None = None
    verification_status: str = "unverified"  # unverified, verified, failed
    created_at: str | None = None


class ArtifactManager:
    def create_artifact(
        self,
        task_id: str,
        title: str,
        type: str,
        content: str,
        source_path: str | None = None,
        verification_status: str = "unverified",
    ) -> ArtifactModel:
        artifact_id = str(uuid.uuid4())
        with get_db() as db:
            db.execute(
                """
                INSERT INTO artifacts (id, task_id, title, type, content, source_path, verification_status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (artifact_id, task_id, title, type, content, source_path, verification_status),
            )
            row = db.execute("SELECT * FROM artifacts WHERE id = ?", (artifact_id,)).fetchone()
            return ArtifactModel(
                id=row["id"],
                task_id=row["task_id"],
                title=row["title"],
                type=row["type"],
                content=row["content"],
                source_path=row["source_path"],
                verification_status=row["verification_status"],
                created_at=str(row["created_at"]),
            )

    def get_task_artifacts(self, task_id: str) -> list[ArtifactModel]:
        with get_db() as db:
            rows = db.execute(
                "SELECT * FROM artifacts WHERE task_id = ? ORDER BY created_at ASC", (task_id,)
            ).fetchall()
            return [
                ArtifactModel(
                    id=r["id"],
                    task_id=r["task_id"],
                    title=r["title"],
                    type=r["type"],
                    content=r["content"],
                    source_path=r["source_path"],
                    verification_status=r["verification_status"],
                    created_at=str(r["created_at"]),
                )
                for r in rows
            ]

    def update_verification_status(self, artifact_id: str, status: str) -> None:
        with get_db() as db:
            db.execute(
                "UPDATE artifacts SET verification_status = ? WHERE id = ?",
                (status, artifact_id),
            )


artifact_manager = ArtifactManager()
