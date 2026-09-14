"""Verification and test running tool."""

import asyncio
import os
import time
from typing import Any
from nusa.security.path_jail import PathJail
from nusa.security.redaction import redact_secrets


async def tool_run_test(
    workspace_root: str,
    command: str,
    timeout_seconds: int = 60,
) -> dict[str, Any]:
    """Execute a verification test command inside the workspace directory."""
    jail = PathJail(workspace_root)
    # Ensure workspace directory exists
    work_dir = jail.root

    start_time = time.time()
    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            cwd=str(work_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )

        stdout_b, stderr_b = await asyncio.wait_for(
            proc.communicate(), timeout=timeout_seconds
        )
        duration_ms = int((time.time() - start_time) * 1000)

        stdout = redact_secrets(stdout_b.decode("utf-8", errors="replace"))
        stderr = redact_secrets(stderr_b.decode("utf-8", errors="replace"))
        passed = (proc.returncode == 0)

        return {
            "success": True,
            "passed": passed,
            "exit_code": proc.returncode,
            "command": command,
            "duration_ms": duration_ms,
            "stdout": stdout,
            "stderr": stderr,
            "summary": "Tests passed successfully" if passed else f"Tests failed with exit code {proc.returncode}",
        }
    except asyncio.TimeoutError:
        duration_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "passed": False,
            "exit_code": -1,
            "command": command,
            "duration_ms": duration_ms,
            "error": f"Test command timed out after {timeout_seconds} seconds.",
        }
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "passed": False,
            "exit_code": -1,
            "command": command,
            "duration_ms": duration_ms,
            "error": f"Test execution failed: {str(e)}",
        }
