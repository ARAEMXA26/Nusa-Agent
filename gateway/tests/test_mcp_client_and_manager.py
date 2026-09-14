"""Unit and integration tests for MCP Client, stdio transport, reference server, and MCP Manager."""

import asyncio
import sys
from pathlib import Path
import pytest
from nusa.mcp.client import MCPClient
from nusa.mcp.manager import MCPManager, MCPServerConfig


@pytest.mark.asyncio
async def test_mcp_client_stdio_handshake_and_tools():
    ref_server = Path(__file__).parent.parent / "nusa" / "mcp" / "reference_server.py"
    client = MCPClient(server_id="test-ref", name="TestRef")

    await client.connect_stdio(sys.executable, [str(ref_server)])
    assert client.is_connected is True

    init_res = await client.initialize()
    assert init_res["serverInfo"]["name"] == "nusa-reference-mcp"

    tools = await client.list_tools()
    tool_names = [t["name"] for t in tools]
    assert "mcp_system_info" in tool_names
    assert "mcp_hash_calculator" in tool_names
    assert "mcp_echo" in tool_names

    # Test calling mcp_hash_calculator
    call_res = await client.call_tool("mcp_hash_calculator", {"text": "hello", "algorithm": "sha256"})
    content = call_res["content"][0]["text"]
    assert "digest" in content
    # SHA256 of "hello" is 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    assert "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824" in content

    # Test calling mcp_echo
    echo_res = await client.call_tool("mcp_echo", {"message": "Nusa Agent Live"})
    assert "Echo: Nusa Agent Live" in echo_res["content"][0]["text"]

    await client.close()
    assert client.is_connected is False


@pytest.mark.asyncio
async def test_mcp_manager_deferred_search_and_quarantine():
    ref_server = Path(__file__).parent.parent / "nusa" / "mcp" / "reference_server.py"
    mgr = MCPManager()

    mgr.register_server(
        MCPServerConfig(
            id="srv-1",
            name="Utilities Server",
            transport="stdio",
            command=sys.executable,
            args=[str(ref_server)],
            enabled=True,
        )
    )

    started = await mgr.start_server("srv-1")
    assert started is True

    # Deferred tool search
    matches = mgr.search_tools(query="hash")
    assert len(matches) == 1
    assert matches[0].name == "mcp_hash_calculator"

    # Execution via manager
    res = await mgr.call_tool("mcp_echo", {"message": "MCP Manager Test"})
    assert "Echo: MCP Manager Test" in str(res)

    # Test quarantine
    mgr.quarantine_server("srv-1", reason="Violated policy")
    servers = mgr.list_servers()
    assert servers[0].is_quarantined is True

    # Tools must be cleared
    assert len(mgr.list_all_tools()) == 0

    await mgr.shutdown()
