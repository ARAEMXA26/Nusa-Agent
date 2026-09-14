"""Unit and Security Tests for Browser and Computer-Use Tools."""

import pytest
from pathlib import Path
from nusa.security.policy_engine import PolicyEngine, PolicyDecision
from nusa.tools.computer import (
    tool_screen_capture,
    tool_system_keypress,
    tool_system_mouse_click,
)
from nusa.tools.registry import tool_registry


def test_policy_engine_evaluates_browser_and_computer_tools(temp_workspace: Path):
    engine = PolicyEngine(str(temp_workspace))

    # browser_navigate requires human approval (ASK)
    eval_nav = engine.evaluate("browser_navigate", {"url": "https://example.com"})
    assert eval_nav.decision == PolicyDecision.ASK
    assert eval_nav.requires_approval is True
    assert "https://example.com" in eval_nav.preview

    # Read-only browser tools default to ALLOW
    eval_snap = engine.evaluate("browser_snapshot", {})
    assert eval_snap.decision == PolicyDecision.ALLOW
    assert eval_snap.requires_approval is False

    eval_type = engine.evaluate("browser_type", {"target": "el-1", "text": "test"})
    assert eval_type.decision == PolicyDecision.ALLOW

    # Computer-use tools strictly require approval (ASK)
    eval_screen = engine.evaluate("screen_capture", {"filename": "scr.png"})
    assert eval_screen.decision == PolicyDecision.ASK
    assert eval_screen.requires_approval is True

    eval_key = engine.evaluate("system_keypress", {"key": "enter"})
    assert eval_key.decision == PolicyDecision.ASK
    assert eval_key.requires_approval is True

    eval_mouse = engine.evaluate("system_mouse_click", {"x": 100, "y": 200, "button": "left"})
    assert eval_mouse.decision == PolicyDecision.ASK
    assert eval_mouse.requires_approval is True


@pytest.mark.asyncio
async def test_computer_use_coordinate_bounds_validation(temp_workspace: Path):
    # Valid coordinates
    res_valid = await tool_system_mouse_click(str(temp_workspace), x=500, y=500, button="left")
    assert res_valid["success"] is True

    # Out of bounds X
    res_invalid_x = await tool_system_mouse_click(str(temp_workspace), x=99999, y=500, button="left")
    assert res_invalid_x["success"] is False
    assert "exceed allowed screen bounds" in res_invalid_x["error"]

    # Negative coordinates
    res_negative = await tool_system_mouse_click(str(temp_workspace), x=-10, y=500, button="left")
    assert res_negative["success"] is False
    assert "exceed allowed screen bounds" in res_negative["error"]

    # Invalid button
    res_btn = await tool_system_mouse_click(str(temp_workspace), x=100, y=100, button="middle_destroy")
    assert res_btn["success"] is False
    assert "Invalid mouse button" in res_btn["error"]


@pytest.mark.asyncio
async def test_computer_use_keystroke_sanitization(temp_workspace: Path):
    # Valid key
    res_valid = await tool_system_keypress(str(temp_workspace), "tab")
    assert res_valid["success"] is True

    # Single alphanumeric character
    res_char = await tool_system_keypress(str(temp_workspace), "a")
    assert res_char["success"] is True

    # Malicious injection attempt
    res_malicious = await tool_system_keypress(str(temp_workspace), '"; rm -rf / ; echo "')
    assert res_malicious["success"] is False
    assert "not in the safe keystroke allowlist" in res_malicious["error"]


@pytest.mark.asyncio
async def test_screen_capture_within_workspace(temp_workspace: Path):
    res = await tool_screen_capture(str(temp_workspace), "test_desktop.png")
    assert res["success"] is True
    target_file = temp_workspace / "test_desktop.png"
    assert target_file.exists()
    assert target_file.stat().st_size > 0


def test_registry_contains_phase4_tools():
    tool_names = [t.name for t in tool_registry.get_tool_definitions()]
    assert "browser_navigate" in tool_names
    assert "browser_snapshot" in tool_names
    assert "browser_click" in tool_names
    assert "browser_type" in tool_names
    assert "browser_screenshot" in tool_names
    assert "screen_capture" in tool_names
    assert "system_keypress" in tool_names
    assert "system_mouse_click" in tool_names
