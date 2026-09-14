"""API routes for Browser Sandbox and DOM-first inspection."""

from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from nusa.browser.manager import browser_manager
from nusa.browser.security import BrowserSecurityError

router = APIRouter(prefix="/api/browser", tags=["browser"])


class NavigateRequest(BaseModel):
    url: str


class ClickRequest(BaseModel):
    target: str


class TypeRequest(BaseModel):
    target: str
    text: str


@router.get("/status")
async def get_browser_status() -> dict[str, Any]:
    """Get active browser status, current URL, and title."""
    return {
        "is_open": browser_manager._page is not None and not browser_manager._page.is_closed(),
        "url": browser_manager._current_url,
        "title": browser_manager._current_title,
    }


@router.post("/navigate")
async def navigate_browser(req: NavigateRequest) -> dict[str, Any]:
    """Navigate browser to a URL and return clean DOM snapshot."""
    try:
        snapshot = await browser_manager.navigate(req.url)
        return snapshot
    except BrowserSecurityError as e:
        raise HTTPException(status_code=403, detail=f"Navigation blocked by security policy: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Navigation error: {e}")


@router.get("/snapshot")
async def get_dom_snapshot() -> dict[str, Any]:
    """Get the current page DOM snapshot."""
    snapshot = await browser_manager.get_snapshot()
    return snapshot


@router.post("/click")
async def click_element(req: ClickRequest) -> dict[str, Any]:
    """Click on an element by ID or selector."""
    res = await browser_manager.click(req.target)
    return res


@router.post("/type")
async def type_element(req: TypeRequest) -> dict[str, Any]:
    """Type text into an element."""
    res = await browser_manager.type_text(req.target, req.text)
    return res


@router.post("/close")
async def close_browser() -> dict[str, Any]:
    """Close the active browser session."""
    await browser_manager.close()
    return {"message": "Browser session closed successfully"}
