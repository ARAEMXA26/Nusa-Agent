"""Workspace, Project Explorer, and Filesystem REST APIs with PathJail security."""

import os
from pathlib import Path
from typing import Any
import asyncio
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from nusa.security.path_jail import PathJail
from nusa.tools.file_tools import tool_file_read, tool_file_write
from nusa.tools.git_tools import tool_git_status
from nusa.db.connection import get_db

router = APIRouter(prefix="/api/workspace", tags=["workspace"])

# Global active workspace state
_current_workspace_root: str = str(Path(os.getcwd()).resolve())
if not Path(_current_workspace_root).joinpath("gateway").exists() and Path("/Users/ariardianto/Documents/AGENT/CODE").exists():
    _current_workspace_root = "/Users/ariardianto/Documents/AGENT/CODE"


def get_current_workspace() -> str:
    global _current_workspace_root
    return _current_workspace_root


def set_current_workspace(root_path: str) -> str:
    global _current_workspace_root
    resolved = str(Path(root_path).expanduser().resolve())
    _current_workspace_root = resolved
    return _current_workspace_root


def detect_project_types(root: Path) -> list[str]:
    types: list[str] = []
    if (root / "package.json").exists():
        types.append("nodejs")
    if (root / "tsconfig.json").exists():
        types.append("typescript")
    if (root / "pyproject.toml").exists() or (root / "requirements.txt").exists():
        types.append("python")
    if (root / "Cargo.toml").exists():
        types.append("rust")
    if (root / "go.mod").exists():
        types.append("go")
    if (root / "electron-builder.json").exists() or (root / "desktop").exists():
        types.append("electron")
    if (root / ".git").exists():
        types.append("git")
    if not types:
        types.append("generic")
    return types


class OpenWorkspaceRequest(BaseModel):
    root_path: str
    name: str | None = None


class WriteFileRequest(BaseModel):
    path: str
    content: str


class CreateItemRequest(BaseModel):
    path: str
    is_dir: bool = False


class RenameItemRequest(BaseModel):
    old_path: str
    new_path: str


@router.post("/open")
def open_workspace(req: OpenWorkspaceRequest):
    p = Path(req.root_path).expanduser().resolve()
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"Directory does not exist: {req.root_path}")
    if not p.is_dir():
        raise HTTPException(status_code=400, detail=f"Target path is not a directory: {req.root_path}")

    root_str = set_current_workspace(str(p))
    proj_name = req.name or p.name
    proj_types = detect_project_types(p)

    # Persist or update in DB
    with get_db() as db:
        existing = db.execute("SELECT id FROM projects WHERE root_path = ?", (root_str,)).fetchone()
        if existing:
            workspace_id = existing["id"]
        else:
            import uuid
            workspace_id = str(uuid.uuid4())
            db.execute(
                "INSERT INTO projects (id, name, root_path, default_model) VALUES (?, ?, ?, ?)",
                (workspace_id, proj_name, root_str, "deterministic"),
            )

    return {
        "status": "open",
        "workspace_id": workspace_id,
        "name": proj_name,
        "root_path": root_str,
        "project_types": proj_types,
    }


@router.get("/current")
def get_workspace_info():
    root_str = get_current_workspace()
    p = Path(root_str)
    return {
        "status": "open" if p.exists() else "error",
        "name": p.name,
        "root_path": root_str,
        "project_types": detect_project_types(p) if p.exists() else [],
    }


@router.get("/tree")
def list_workspace_tree(path: str = Query("."), depth: int = Query(1)):
    root_str = get_current_workspace()
    jail = PathJail(root_str)
    try:
        safe_target = jail.resolve_safe(path)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

    if not safe_target.exists() or not safe_target.is_dir():
        raise HTTPException(status_code=404, detail=f"Directory '{path}' not found")

    entries: list[dict[str, Any]] = []
    try:
        for entry in safe_target.iterdir():
            rel = str(entry.relative_to(jail.root))
            is_dir = entry.is_dir()
            entries.append({
                "name": entry.name,
                "path": str(entry.resolve()),
                "relative_path": rel,
                "is_dir": is_dir,
                "size": entry.stat().st_size if not is_dir and entry.is_file() else 0,
                "extension": entry.suffix.lower() if not is_dir else "",
            })
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied reading directory")

    # Sort directories first, then alphabetical
    entries.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
    return {
        "root": root_str,
        "query_path": path,
        "entries": entries,
    }


@router.get("/file")
def read_workspace_file(path: str = Query(...)):
    root_str = get_current_workspace()
    try:
        res = tool_file_read(root_str, path)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("error"))

    ext = Path(path).suffix.lower()
    return {
        "path": path,
        "content": res.get("content", ""),
        "line_count": res.get("line_count", 0),
        "extension": ext,
    }


@router.post("/file")
def write_workspace_file(req: WriteFileRequest):
    root_str = get_current_workspace()
    try:
        res = tool_file_write(root_str, req.path, req.content)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error"))

    return res


@router.post("/create")
def create_workspace_item(req: CreateItemRequest):
    root_str = get_current_workspace()
    jail = PathJail(root_str)
    try:
        target = jail.resolve_safe(req.path)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

    if req.is_dir:
        target.mkdir(parents=True, exist_ok=True)
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            target.write_text("", encoding="utf-8")

    return {"success": True, "path": req.path}


@router.post("/rename")
def rename_workspace_item(req: RenameItemRequest):
    root_str = get_current_workspace()
    jail = PathJail(root_str)
    try:
        old_target = jail.resolve_safe(req.old_path)
        new_target = jail.resolve_safe(req.new_path)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

    if not old_target.exists():
        raise HTTPException(status_code=404, detail=f"Source '{req.old_path}' not found")

    new_target.parent.mkdir(parents=True, exist_ok=True)
    old_target.rename(new_target)
    return {"success": True, "old_path": req.old_path, "new_path": req.new_path}


@router.delete("/file")
def delete_workspace_item(path: str = Query(...)):
    root_str = get_current_workspace()
    jail = PathJail(root_str)
    try:
        target = jail.resolve_safe(path)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Target '{path}' not found")

    if target.is_dir():
        import shutil
        shutil.rmtree(target)
    else:
        target.unlink()

    return {"success": True, "deleted_path": path}


@router.get("/git/status")
async def get_workspace_git_status():
    root_str = get_current_workspace()
    try:
        status_res = await tool_git_status(root_str)
        branch = "main"
        # Extract branch name if git available
        proc = await asyncio.create_subprocess_exec(
            "git", "rev-parse", "--abbrev-ref", "HEAD",
            cwd=root_str,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        out, _ = await proc.communicate()
        if proc.returncode == 0:
            branch = out.decode("utf-8").strip()

        raw_status = status_res.get("status", "")
        modified_count = len([l for l in raw_status.splitlines() if l.strip()])
        return {
            "success": True,
            "branch": branch,
            "is_repo": True,
            "modified_count": modified_count,
            "raw_status": raw_status,
        }
    except Exception as e:
        return {
            "success": False,
            "branch": "main",
            "is_repo": False,
            "modified_count": 0,
            "error": str(e),
        }
