"""API routes for Cron Task Scheduler."""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from nusa.scheduler.manager import cron_manager

router = APIRouter(prefix="/api/cron", tags=["cron"])


class CronJobCreateRequest(BaseModel):
    title: str
    prompt: str
    cron_expr: str
    project_id: Optional[str] = None
    profile_id: Optional[str] = None
    enabled: bool = True


class CronJobToggleRequest(BaseModel):
    enabled: Optional[bool] = None


@router.get("/jobs")
async def list_cron_jobs(project_id: Optional[str] = Query(default=None)):
    return {"jobs": cron_manager.list_jobs(project_id=project_id)}


@router.post("/jobs")
async def create_cron_job(req: CronJobCreateRequest):
    try:
        job = cron_manager.create_job(
            title=req.title,
            prompt=req.prompt,
            cron_expr=req.cron_expr,
            project_id=req.project_id,
            profile_id=req.profile_id,
            enabled=req.enabled,
        )
        return {"success": True, "job": job}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/jobs/{job_id}/toggle")
async def toggle_cron_job(job_id: str, req: CronJobToggleRequest):
    try:
        res = cron_manager.toggle_job(job_id=job_id, enabled=req.enabled)
        return {"success": True, "job": res}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/jobs/{job_id}")
async def delete_cron_job(job_id: str):
    deleted = cron_manager.delete_job(job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Cron job not found")
    return {"success": True, "job_id": job_id}


@router.post("/jobs/{job_id}/run")
async def run_cron_job_now(job_id: str):
    try:
        res = await cron_manager.execute_job(job_id)
        return {"success": True, "run": res}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/jobs/{job_id}/runs")
async def list_cron_job_runs(job_id: str, limit: int = Query(default=20)):
    runs = cron_manager.list_job_runs(job_id, limit=limit)
    return {"runs": runs, "count": len(runs)}
