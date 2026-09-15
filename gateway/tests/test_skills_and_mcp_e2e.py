"""End-to-end integration test verifying Skills progressive disclosure and MCP tool calling."""

import tempfile
import sys
from pathlib import Path
import pytest
from nusa.core.orchestrator import TaskOrchestrator
from nusa.core.state_machine import TaskState
from nusa.db.connection import get_db, init_db
from nusa.mcp.manager import mcp_manager, MCPServerConfig
from nusa.skills.manager import skill_manager
from nusa.tools.registry import tool_registry


@pytest.mark.asyncio
async def test_skills_and_mcp_execution():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.sqlite"
        init_db(db_path)

        project_root = Path(tmpdir) / "workspace"
        project_root.mkdir()

        # Start reference MCP server
        ref_server = Path(__file__).parent.parent / "nusa" / "mcp" / "reference_server.py"
        mcp_manager.register_server(
            MCPServerConfig(
                id="e2e-mcp",
                name="E2E MCP Server",
                transport="stdio",
                command=sys.executable,
                args=[str(ref_server)],
                enabled=True,
            )
        )
        started = await mcp_manager.start_server("e2e-mcp")
        assert started is True

        # Test 1: Progressive Skill Activation via Tool Registry
        skill_res = await tool_registry.execute_tool(
            str(project_root),
            "skill_activate",
            {"skill_name": "code-reviewer"},
        )
        assert skill_res["success"] is True
        assert "Code Reviewer" in skill_res["instructions"]

        # Test 2: Deferred MCP Tool Search via Tool Registry
        search_res = await tool_registry.execute_tool(
            str(project_root),
            "tool_search_mcp",
            {"query": "hash"},
        )
        assert search_res["success"] is True
        matches = search_res["matches"]
        assert any(m["name"] == "mcp_hash_calculator" for m in matches)

        # Test 3: Call MCP Tool via Tool Registry
        mcp_call_res = await tool_registry.execute_tool(
            str(project_root),
            "mcp_hash_calculator",
            {"text": "Nusa Agent E2E Secret sk-proj12345678901234567890", "algorithm": "sha256"},
        )
        assert mcp_call_res["success"] is True
        # Output should be redacted and contain hash digest
        content = mcp_call_res["result"]["content"][0]["text"]
        assert "digest" in content

        await mcp_manager.shutdown()
