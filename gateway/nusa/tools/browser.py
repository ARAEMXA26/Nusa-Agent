"""Browser interaction tools using Playwright DOM-first automation."""

import base64
from pathlib import Path
from typing import Any
from nusa.browser.manager import browser_manager


async def tool_browser_navigate(workspace_root: str, url: str) -> dict[str, Any]:
    """Navigate to a web URL, check security, and return structured clean DOM snapshot."""
    res = await browser_manager.navigate(url)
    return res


async def tool_browser_snapshot(workspace_root: str) -> dict[str, Any]:
    """Capture current page DOM snapshot, extracting text preview and interactive elements."""
    res = await browser_manager.get_snapshot()
    return res


async def tool_browser_click(workspace_root: str, target: str) -> dict[str, Any]:
    """Click on an interactive element by its element ID (e.g. 'el-1') or CSS selector."""
    res = await browser_manager.click(target)
    return res


async def tool_browser_type(workspace_root: str, target: str, text: str) -> dict[str, Any]:
    """Type text into an input field or textarea identified by element ID or selector."""
    res = await browser_manager.type_text(target, text)
    return res


async def tool_browser_screenshot(workspace_root: str, filename: str = "screenshot.png") -> dict[str, Any]:
    """Capture screenshot of the current page and save inside workspace."""
    out_path = Path(workspace_root) / filename
    data = await browser_manager.screenshot(output_path=str(out_path))
    if data:
        return {
            "success": True,
            "filename": filename,
            "path": str(out_path),
            "size_bytes": len(data),
            "preview_base64": base64.b64encode(data[:4096]).decode("ascii"),
        }
    return {"success": False, "error": "No browser page is currently active."}
