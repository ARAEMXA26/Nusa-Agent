"""Tests for DOM Snapshot Engine."""

from nusa.browser.dom_snapshot import DOMSnapshotEngine

HTML_SAMPLE = """
<!DOCTYPE html>
<html>
<head>
    <title>Nusa Portal - Test Page</title>
    <style>body { background: red; } .hidden { display: none; }</style>
    <script>alert("malicious script should be stripped");</script>
</head>
<body>
    <header>
        <h1>Welcome to Nusa Portal</h1>
        <p>Your local-first autonomous command center.</p>
        <svg><circle cx="50" cy="50" r="40" /></svg>
    </header>
    <main>
        <form action="/login" method="POST">
            <label for="uname">Username</label>
            <input type="text" id="uname" name="username" placeholder="Enter username..." />
            
            <label for="pwd">Password</label>
            <input type="password" id="pwd" name="password" placeholder="Enter password..." />
            
            <button type="submit" id="submit-btn">Log In</button>
            <button type="button" id="cancel-btn">Cancel</button>
        </form>
        <section>
            <a href="https://example.com/docs">Read Documentation</a>
            <a href="/privacy">Privacy Policy</a>
        </section>
    </main>
    <footer>
        <p>&copy; 2026 Nusa Agent</p>
    </footer>
</body>
</html>
"""


def test_dom_snapshot_clean_extraction():
    snapshot = DOMSnapshotEngine.process_html(HTML_SAMPLE)

    assert snapshot["title"] == "Nusa Portal - Test Page"
    
    # Scripts and styles should NOT be present in preview
    preview = snapshot["text_preview"]
    assert "malicious script" not in preview
    assert "background: red" not in preview
    assert "Welcome to Nusa Portal" in preview
    assert "Your local-first autonomous command center" in preview

    # Interactive elements extraction
    interactive = snapshot["interactive_elements"]
    assert len(interactive) >= 5

    types = [el["type"] for el in interactive]
    assert "input" in types
    assert "button" in types
    assert "a" in types

    # Check button text
    btn_texts = [el.get("text") for el in interactive if el["type"] == "button"]
    assert "Log In" in btn_texts
    assert "Cancel" in btn_texts

    # Check input placeholders
    placeholders = [el.get("placeholder") for el in interactive if el["type"] == "input"]
    assert "Enter username..." in placeholders
    assert "Enter password..." in placeholders
