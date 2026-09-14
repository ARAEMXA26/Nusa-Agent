"""Git inspection tools."""

import asyncio
from typing import Any
from nusa.security.path_jail import PathJail


async def tool_git_status(workspace_root: str) -> dict[str, Any]:
    jail = PathJail(workspace_root)
    work_dir = jail.root
    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "status", "--porcelain",
            cwd=str(work_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_b, stderr_b = await proc.communicate()
        if proc.returncode != 0:
            return {"success": False, "error": stderr_b.decode("utf-8", errors="replace")}

        return {"success": True, "status": stdout_b.decode("utf-8", errors="replace")}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def tool_git_diff(workspace_root: str) -> dict[str, Any]:
    jail = PathJail(workspace_root)
    work_dir = jail.root
    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "diff",
            cwd=str(work_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_b, stderr_b = await proc.communicate()
        if proc.returncode != 0:
            return {"success": False, "error": stderr_b.decode("utf-8", errors="replace")}

        return {"success": True, "diff": stdout_b.decode("utf-8", errors="replace")}
    except Exception as e:
        return {"success": False, "error": str(e)}
