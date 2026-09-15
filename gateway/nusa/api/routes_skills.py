"""REST endpoints for Skills Hub management, auditing, testing, and execution traces."""

import logging
from typing import Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from nusa.skills.manager import skill_manager
from nusa.skills.models import RiskLevel, ScanResult, SkillDetail, SkillManifest, SkillScope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/skills", tags=["skills"])


class CreateSkillRequest(BaseModel):
    manifest: dict[str, Any]
    instructions: str
    scope: str = "user"
    project_root: str | None = None


class UpdateSkillRequest(BaseModel):
    manifest: dict[str, Any] | None = None
    instructions: str | None = None
    project_root: str | None = None


class ImportSkillRequest(BaseModel):
    source_path: str | None = None
    manifest: dict[str, Any] | None = None
    instructions: str | None = None
    scope: str = "user"
    project_root: str | None = None


class ToggleSkillRequest(BaseModel):
    name: str | None = None
    skill_id: str | None = None
    enabled: bool
    project_id: str | None = None


@router.get("")
def list_skills(project_root: str | None = Query(None)):
    """List all available skills with deterministic precedence, audit status, and dependency health."""
    skills = skill_manager.discover_all_skills(project_root=project_root)
    result = []
    for s in skills:
        health = skill_manager.check_dependencies_health(s)
        # Usage stats
        detail = skill_manager.get_skill_detail(s.id, project_root=project_root)
        usage_count = detail.usage_count if detail else 0
        last_used_at = detail.last_used_at if detail else None

        result.append({
            "id": s.id,
            "name": s.name,
            "version": s.version,
            "description": s.description,
            "tags": s.tags,
            "scope": s.scope.value,
            "risk_level": s.risk_level.value,
            "enabled": s.enabled,
            "tools": s.tools,
            "allowed_tools": s.tools,
            "optional_tools": s.optional_tools,
            "path": str(s.path),
            "audit": s.audit.model_dump(),
            "scan_result": s.audit.model_dump(),
            "dependencies_health": [d.model_dump() for d in health],
            "has_scripts": s.parsed.has_scripts,
            "has_references": s.parsed.has_references,
            "has_assets": s.parsed.has_assets,
            "usage_count": usage_count,
            "last_used_at": last_used_at,
        })
    return result


@router.get("/summary")
def get_progressive_summary(project_root: str | None = Query(None)):
    """Level 1 progressive disclosure summary for LLM context."""
    return skill_manager.get_progressive_summary(project_root=project_root)


@router.post("/discover")
def trigger_discover(project_root: str | None = Query(None)):
    """Forces re-discovery of skills across bundled, user, and workspace directories."""
    skills = skill_manager.discover_all_skills(project_root=project_root)
    return {
        "status": "ok",
        "discovered_count": len(skills),
        "skill_ids": [s.id for s in skills],
    }


@router.get("/{skill_id}")
def get_skill_detail(skill_id: str, project_root: str | None = Query(None)):
    """Fetches full skill detail including manifest, SKILL.md, audit findings, and dependency health."""
    detail = skill_manager.get_skill_detail(skill_id, project_root=project_root)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found.")
    return detail.model_dump()


@router.post("/{skill_id}/enable")
def enable_skill(skill_id: str, project_id: str | None = Query(None)):
    """Enables a skill with fail-closed security enforcement."""
    success = skill_manager.toggle_skill(skill_id, True, project_id=project_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot enable skill '{skill_id}'. It may have failed its security audit or does not exist.",
        )
    return {"status": "ok", "skill_id": skill_id, "enabled": True}


@router.post("/{skill_id}/disable")
def disable_skill(skill_id: str, project_id: str | None = Query(None)):
    """Disables a skill so it cannot be automatically routed."""
    success = skill_manager.toggle_skill(skill_id, False, project_id=project_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found.")
    return {"status": "ok", "skill_id": skill_id, "enabled": False}


@router.post("/toggle")
def toggle_skill_legacy(req: ToggleSkillRequest):
    """Legacy toggle endpoint for backward compatibility."""
    target_id = req.skill_id or req.name
    if not target_id:
        raise HTTPException(status_code=400, detail="Must provide 'skill_id' or 'name'.")
    success = skill_manager.toggle_skill(target_id, req.enabled, project_id=req.project_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change state for skill '{target_id}' (may have failed security audit).",
        )
    return {"status": "ok", "skill_id": target_id, "enabled": req.enabled}


@router.post("/{skill_id}/audit")
def audit_skill(skill_id: str):
    """Executes on-demand static security audit and persists findings."""
    result = skill_manager.audit_skill(skill_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found.")
    return result.model_dump()


@router.post("/{skill_id}/test")
def test_skill(skill_id: str):
    """Performs dry-run diagnostic test of manifest, contract sections, dependencies, and security."""
    report = skill_manager.test_skill(skill_id)
    if not report.get("success") and "not found" in report.get("error", ""):
        raise HTTPException(status_code=404, detail=report["error"])
    return report


@router.post("/create")
def create_skill(req: CreateSkillRequest):
    """Creates a new skill package in user or workspace scope."""
    try:
        scope_enum = SkillScope(req.scope)
    except ValueError:
        scope_enum = SkillScope.USER

    try:
        detail = skill_manager.create_user_skill(
            manifest_data=req.manifest,
            instructions=req.instructions,
            workspace_root=req.project_root,
            scope=scope_enum,
        )
        return detail.model_dump()
    except Exception as e:
        logger.error(f"Error creating skill: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import")
def import_skill(req: ImportSkillRequest):
    """Imports an external skill from directory or manifest payload."""
    try:
        scope_enum = SkillScope(req.scope)
    except ValueError:
        scope_enum = SkillScope.USER

    try:
        payload: str | dict[str, Any]
        if req.source_path:
            payload = req.source_path
        else:
            payload = {
                "manifest": req.manifest or {},
                "instructions": req.instructions or "",
            }

        detail = skill_manager.import_skill(
            source_path_or_dict=payload,
            scope=scope_enum,
            workspace_root=req.project_root,
        )
        return detail.model_dump()
    except Exception as e:
        logger.error(f"Error importing skill: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{skill_id}")
def update_skill(skill_id: str, req: UpdateSkillRequest):
    """Updates user or workspace skill instructions or manifest."""
    try:
        detail = skill_manager.update_skill(
            skill_id=skill_id,
            manifest_data=req.manifest,
            instructions=req.instructions,
            workspace_root=req.project_root,
        )
        return detail.model_dump()
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except FileNotFoundError as fe:
        raise HTTPException(status_code=404, detail=str(fe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{skill_id}")
def delete_skill(skill_id: str, project_root: str | None = Query(None)):
    """Deletes user or workspace skill. Bundled skills cannot be deleted."""
    try:
        success = skill_manager.delete_skill(skill_id, workspace_root=project_root)
        if not success:
            raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found.")
        return {"status": "ok", "deleted_id": skill_id}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{skill_id}/traces")
def get_skill_traces(skill_id: str, limit: int = Query(50)):
    """Fetches execution traces, tool calls, and human approvals for observability."""
    traces = skill_manager.get_skill_traces(skill_id, limit=limit)
    return {"skill_id": skill_id, "traces": traces}
