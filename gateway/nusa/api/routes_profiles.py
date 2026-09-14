"""API routes for Scoped Profiles management."""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from nusa.profiles.manager import profile_manager

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


class ProfileCreateRequest(BaseModel):
    name: str
    description: str = ""
    default_model: str = "openai/gpt-4o"


class ProfileSwitchRequest(BaseModel):
    name: str


@router.get("")
async def list_profiles():
    return {"profiles": profile_manager.list_profiles()}


@router.get("/active")
async def get_active_profile():
    return profile_manager.get_active_profile()


@router.post("/active")
async def set_active_profile(req: ProfileSwitchRequest):
    try:
        updated = profile_manager.set_active_profile(req.name)
        return {"success": True, "active_profile": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("")
async def create_profile(req: ProfileCreateRequest):
    try:
        created = profile_manager.create_profile(
            name=req.name,
            description=req.description,
            default_model=req.default_model,
        )
        return {"success": True, "profile": created}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
