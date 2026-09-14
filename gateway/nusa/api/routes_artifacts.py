"""Artifacts API routes."""

from fastapi import APIRouter
from nusa.artifacts.manager import artifact_manager, ArtifactModel

router = APIRouter(prefix="/api/artifacts", tags=["artifacts"])


@router.get("/task/{task_id}", response_model=list[ArtifactModel])
def get_task_artifacts(task_id: str):
    return artifact_manager.get_task_artifacts(task_id)
