"""End-to-end automated tests for Browser Manager with Playwright async."""

import pytest
from nusa.browser.manager import BrowserManager
from nusa.browser.security import BrowserSecurity


@pytest.mark.asyncio
async def test_browser_page_lifecycle_and_dom_snapshot():
    mgr = BrowserManager(security=BrowserSecurity(allow_private_ips=True))
    try:
        page = await mgr.ensure_page()
        assert page is not None

        # Load an interactive HTML test page directly into browser
        html_content = """
        <!DOCTYPE html>
        <html>
        <head><title>Test Automation Page</title></head>
        <body>
            <h1>Nusa Agent Headless Automation</h1>
            <input id="search-input" placeholder="Type query here..." type="text" />
            <button id="btn-submit" onclick="document.getElementById('result').innerText = 'Submitted: ' + document.getElementById('search-input').value">Search</button>
            <div id="result">Initial</div>
        </body>
        </html>
        """
        await page.set_content(html_content)

        # 1. Snapshot
        snapshot = await mgr.get_snapshot()
        assert snapshot["success"] is True
        assert snapshot["title"] == "Test Automation Page"
        assert "Nusa Agent Headless Automation" in snapshot["text_preview"]

        # Verify interactive elements
        elements = snapshot["interactive_elements"]
        assert len(elements) >= 2

        # 2. Type into input
        type_res = await mgr.type_text("input[id='search-input']", "quantum computing")
        assert type_res["success"] is True

        # 3. Click search button
        click_res = await mgr.click("button[id='btn-submit']")
        assert click_res["success"] is True

        # Verify DOM was updated
        updated_text = await page.inner_text("#result")
        assert "Submitted: quantum computing" in updated_text

        # 4. Screenshot
        screenshot_bytes = await mgr.screenshot()
        assert screenshot_bytes is not None
        assert len(screenshot_bytes) > 0
    finally:
        await mgr.close()
