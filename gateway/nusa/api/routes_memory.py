"""API routes for Long-term Memory inspection and manipulation."""

from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from nusa.memory.store import memory_store

router = APIRouter(prefix="/api/memory", tags=["memory"])


class MemoryCreateRequest(BaseModel):
    key: str
    value: str
    scope: str = Field(default="project")
    project_id: Optional[str] = None
    workspace_root: Optional[str] = None


@router.get("")
async def list_or_search_memories(
    query: Optional[str] = Query(default=None),
    project_id: Optional[str] = Query(default=None),
    scope: Optional[str] = Query(default=None),
    limit: int = Query(default=20),
):
    if query:
        results = memory_store.search_memories(query=query, project_id=project_id, limit=limit)
        return {"items": results, "count": len(results)}
    items = memory_store.list_memories(project_id=project_id, scope=scope)
    return {"items": items, "count": len(items)}


@router.post("")
async def create_memory(req: MemoryCreateRequest):
    res = memory_store.store_memory(
        key=req.key,
        value=req.value,
        scope=req.scope,
        project_id=req.project_id,
        workspace_root=req.workspace_root,
    )
    return {"success": True, "memory": res}


@router.delete("/{key}")
async def delete_memory(
    key: str,
    project_id: Optional[str] = Query(default=None),
    workspace_root: Optional[str] = Query(default=None),
):
    deleted = memory_store.delete_memory(key=key, project_id=project_id, workspace_root=workspace_root)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Memory item '{key}' not found.")
    return {"success": True, "key": key}


@router.get("/context")
async def get_memory_context(project_id: Optional[str] = Query(default=None)):
    snippet = memory_store.format_context_snippet(project_id=project_id)
    return {"context": snippet}
