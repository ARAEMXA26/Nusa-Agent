"""Sandboxed shell command execution tool."""

import asyncio
import os
import time
from typing import Any
from nusa.security.path_jail import PathJail
from nusa.security.redaction import redact_secrets


async def tool_shell_execute(
    workspace_root: str,
    command: str,
    timeout_seconds: int = 60,
) -> dict[str, Any]:
    jail = PathJail(workspace_root)
    work_dir = jail.root

    start_time = time.time()
    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            cwd=str(work_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout_b, stderr_b = await asyncio.wait_for(
            proc.communicate(), timeout=timeout_seconds
        )
        duration_ms = int((time.time() - start_time) * 1000)

        stdout = redact_secrets(stdout_b.decode("utf-8", errors="replace"))
        stderr = redact_secrets(stderr_b.decode("utf-8", errors="replace"))

        return {
            "success": True,
            "exit_code": proc.returncode,
            "duration_ms": duration_ms,
            "stdout": stdout,
            "stderr": stderr,
        }
    except asyncio.TimeoutError:
        duration_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "exit_code": -1,
            "duration_ms": duration_ms,
            "error": f"Command timed out after {timeout_seconds} seconds.",
        }
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "exit_code": -1,
            "duration_ms": duration_ms,
            "error": f"Execution error: {str(e)}",
        }
