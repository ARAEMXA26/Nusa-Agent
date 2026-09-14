"""REST endpoints for Agent Skills Management."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from nusa.skills.manager import skill_manager

router = APIRouter(prefix="/api/skills", tags=["skills"])


class ToggleSkillRequest(BaseModel):
    name: str
    enabled: bool


@router.get("")
def list_skills(project_root: str | None = None):
    """List all available skills with progressive metadata and safety scan results."""
    skills = skill_manager.discover_all_skills(project_root=project_root)
    return [
        {
            "name": s.metadata.name,
            "description": s.metadata.description,
            "version": s.metadata.version,
            "scope": s.metadata.scope,
            "allowed_tools": s.metadata.allowed_tools,
            "tags": s.metadata.tags,
            "enabled": s.metadata.enabled,
            "path": s.metadata.path,
            "checksum": s.metadata.checksum,
            "scan_result": s.scan_result.model_dump(),
            "has_scripts": s.has_scripts,
            "has_references": s.has_references,
            "has_evals": s.has_evals,
        }
        for s in skills
    ]


@router.post("/toggle")
def toggle_skill(req: ToggleSkillRequest):
    """Enable or disable a skill."""
    success = skill_manager.toggle_skill(req.name, req.enabled)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to toggle skill (may be quarantined or not found).")
    return {"status": "ok", "name": req.name, "enabled": req.enabled}


@router.get("/summary")
def get_progressive_summary(project_root: str | None = None):
    """Returns low-token progressive disclosure summary for LLM context."""
    return skill_manager.get_progressive_summary(project_root=project_root)
