"""Browser Manager with Playwright Async API, DOM-first snapshot, and security controls."""

import asyncio
import logging
from typing import Any
try:
    from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright
except ImportError:
    async_playwright = None
    Browser = Any  # type: ignore
    BrowserContext = Any  # type: ignore
    Page = Any  # type: ignore
    Playwright = Any  # type: ignore
from nusa.browser.security import BrowserSecurity, BrowserSecurityError
from nusa.browser.dom_snapshot import DOMSnapshotEngine

logger = logging.getLogger(__name__)


class BrowserManager:
    """Manages headless browser automation sessions with domain guardrails and DOM snapshots."""

    def __init__(self, security: BrowserSecurity | None = None):
        self.security = security or BrowserSecurity()
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._page: Page | None = None
        self._current_url: str = ""
        self._current_title: str = ""
        self._element_map: dict[str, str] = {}  # "el-1" -> selector/xpath

    async def ensure_page(self) -> Page:
        """Lazily initialize browser and page."""
        if self._page and not self._page.is_closed():
            return self._page

        if not self._playwright:
            if async_playwright is None:
                raise BrowserSecurityError("Playwright is not installed. Install with: pip install playwright && playwright install chromium")
            self._playwright = await async_playwright().start()

        if not self._browser:
            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                ],
            )

        if not self._context:
            self._context = await self._browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 NusaAgent/0.1",
            )

        self._page = await self._context.new_page()
        return self._page

    async def navigate(self, url: str) -> dict[str, Any]:
        """Navigate to URL with SSRF/security check and return clean DOM snapshot."""
        safe_url = self.security.validate_url(url)
        page = await self.ensure_page()

        try:
            await page.goto(safe_url, wait_until="domcontentloaded", timeout=20000)
            self._current_url = page.url
            self._current_title = await page.title()

            # Wait a brief moment for dynamic hydration
            await asyncio.sleep(0.5)

            return await self.get_snapshot()
        except Exception as e:
            logger.error("Browser navigation failed for %s: %s", safe_url, e)
            return {
                "success": False,
                "url": safe_url,
                "error": str(e),
                "title": self._current_title,
                "text_preview": "",
                "interactive_elements": [],
            }

    async def get_snapshot(self) -> dict[str, Any]:
        """Extract clean token-efficient DOM snapshot of the current page."""
        if not self._page or self._page.is_closed():
            return {
                "success": False,
                "error": "No active page open",
                "title": "",
                "text_preview": "",
                "interactive_elements": [],
            }

        html = await self._page.content()
        snapshot = DOMSnapshotEngine.process_html(html)
        self._current_title = snapshot.get("title", "")
        self._current_url = self._page.url

        # Store element map for friendly referencing by ID (e.g. "el-1")
        self._element_map.clear()
        for elem in snapshot.get("interactive_elements", []):
            eid = elem.get("id")
            etype = elem.get("type")
            text = elem.get("text", "")
            placeholder = elem.get("placeholder", "")
            if eid:
                if etype == "input" and placeholder:
                    self._element_map[eid] = f"input[placeholder*='{placeholder[:20]}']"
                elif text:
                    self._element_map[eid] = f"{etype}:has-text('{text[:20]}')"
                else:
                    self._element_map[eid] = etype

        return {
            "success": True,
            "url": self._current_url,
            "title": self._current_title,
            "text_preview": snapshot.get("text_preview", ""),
            "interactive_elements": snapshot.get("interactive_elements", []),
            "total_interactive_count": snapshot.get("total_interactive_count", 0),
        }

    async def click(self, selector_or_id: str) -> dict[str, Any]:
        """Click on an element by CSS selector or mapped element ID."""
        page = await self.ensure_page()
        target = self._element_map.get(selector_or_id, selector_or_id)

        try:
            await page.click(target, timeout=5000)
            await asyncio.sleep(0.5)
            # Re-take snapshot after click
            snapshot = await self.get_snapshot()
            return {
                "success": True,
                "clicked_target": target,
                "new_url": page.url,
                "snapshot": snapshot,
            }
        except Exception as e:
            return {
                "success": False,
                "target": target,
                "error": f"Failed to click '{target}': {str(e)}",
            }

    async def type_text(self, selector_or_id: str, text: str) -> dict[str, Any]:
        """Type text into an input element."""
        page = await self.ensure_page()
        target = self._element_map.get(selector_or_id, selector_or_id)

        try:
            await page.fill(target, text, timeout=5000)
            return {
                "success": True,
                "typed_into": target,
                "text_length": len(text),
            }
        except Exception as e:
            return {
                "success": False,
                "target": target,
                "error": f"Failed to type into '{target}': {str(e)}",
            }

    async def screenshot(self, output_path: str | None = None) -> bytes | None:
        """Capture page screenshot."""
        if not self._page or self._page.is_closed():
            return None

        try:
            if output_path:
                await self._page.screenshot(path=output_path, full_page=False)
            return await self._page.screenshot(full_page=False)
        except Exception as e:
            logger.error("Failed to capture screenshot: %s", e)
            return None

    async def close(self):
        """Clean up browser resources."""
        try:
            if self._page and not self._page.is_closed():
                await self._page.close()
            if self._context:
                await self._context.close()
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception as e:
            logger.warning("Error closing browser: %s", e)
        finally:
            self._page = None
            self._context = None
            self._browser = None
            self._playwright = None


browser_manager = BrowserManager()
