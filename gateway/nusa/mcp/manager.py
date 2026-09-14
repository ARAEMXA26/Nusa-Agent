"""MCP Manager orchestrating server connections, tool search, and quarantine."""

import logging
import sys
from pathlib import Path
from typing import Any
from pydantic import BaseModel, Field
from nusa.mcp.client import MCPClient, MCPClientError
from nusa.security.redaction import redact_secrets

logger = logging.getLogger(__name__)


class MCPServerConfig(BaseModel):
    id: str
    name: str
    transport: str = "stdio"  # stdio or http
    command: str = sys.executable
    args: list[str] = Field(default_factory=list)
    url: str = ""
    enabled: bool = True
    is_quarantined: bool = False
    quarantine_reason: str = ""


class MCPToolSnapshot(BaseModel):
    server_id: str
    server_name: str
    name: str
    description: str
    input_schema: dict[str, Any]
    enabled: bool = True


class MCPManager:
    """Manages active MCP servers, progressive tool discovery, and isolation."""

    def __init__(self):
        self._servers: dict[str, MCPServerConfig] = {}
        self._clients: dict[str, MCPClient] = {}
        self._tool_snapshots: dict[str, MCPToolSnapshot] = {}

    def register_server(self, config: MCPServerConfig) -> None:
        self._servers[config.id] = config

    async def start_server(self, server_id: str) -> bool:
        config = self._servers.get(server_id)
        if not config or not config.enabled or config.is_quarantined:
            return False

        try:
            client = MCPClient(server_id=config.id, name=config.name)
            if config.transport == "stdio":
                await client.connect_stdio(config.command, config.args)
            elif config.transport == "http":
                await client.connect_http(config.url)

            # Perform handshake
            await client.initialize()

            # Discover tools
            tools = await client.list_tools()
            for t in tools:
                tool_name = t.get("name", "")
                snapshot = MCPToolSnapshot(
                    server_id=config.id,
                    server_name=config.name,
                    name=tool_name,
                    description=t.get("description", ""),
                    input_schema=t.get("inputSchema", {}),
                    enabled=True,
                )
                self._tool_snapshots[tool_name] = snapshot

            self._clients[config.id] = client
            logger.info(f"MCP Server '{config.name}' started successfully with {len(tools)} tools.")
            return True
        except Exception as e:
            logger.error(f"Failed to start MCP server '{config.name}': {e}")
            self.quarantine_server(server_id, reason=f"Startup failure: {e}")
            return False

    def quarantine_server(self, server_id: str, reason: str) -> None:
        if server_id in self._servers:
            self._servers[server_id].is_quarantined = True
            self._servers[server_id].quarantine_reason = reason
            self._servers[server_id].enabled = False

            # Remove its tools from active snapshots
            tools_to_remove = [
                name for name, t in self._tool_snapshots.items() if t.server_id == server_id
            ]
            for name in tools_to_remove:
                self._tool_snapshots.pop(name, None)

        if server_id in self._clients:
            client = self._clients.pop(server_id)
            import asyncio
            asyncio.create_task(client.close())

    def list_servers(self) -> list[MCPServerConfig]:
        return list(self._servers.values())

    def list_all_tools(self) -> list[MCPToolSnapshot]:
        return list(self._tool_snapshots.values())

    # Deferred / Progressive Tool Search
    def search_tools(self, query: str, limit: int = 5) -> list[MCPToolSnapshot]:
        """Progressive tool discovery: returns tools matching keywords."""
        q = query.lower().strip()
        if not q:
            return list(self._tool_snapshots.values())[:limit]

        matches = []
        for tool in self._tool_snapshots.values():
            if not tool.enabled:
                continue
            name_match = q in tool.name.lower()
            desc_match = q in tool.description.lower()
            if name_match or desc_match:
                matches.append(tool)

        return matches[:limit]

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        snapshot = self._tool_snapshots.get(tool_name)
        if not snapshot or not snapshot.enabled:
            raise MCPClientError(f"MCP tool '{tool_name}' is not available or disabled.")

        client = self._clients.get(snapshot.server_id)
        if not client or not client.is_connected:
            # Try to reconnect
            success = await self.start_server(snapshot.server_id)
            if not success:
                raise MCPClientError(f"MCP server '{snapshot.server_name}' is offline.")
            client = self._clients.get(snapshot.server_id)

        if not client:
            raise MCPClientError(f"Cannot obtain client for tool '{tool_name}'.")

        try:
            raw_result = await client.call_tool(tool_name, arguments)
            return redact_secrets(raw_result)  # type: ignore
        except Exception as e:
            logger.warning(f"Error calling MCP tool '{tool_name}': {e}")
            raise

    async def shutdown(self) -> None:
        for client in self._clients.values():
            await client.close()
        self._clients.clear()


# Global Singleton
mcp_manager = MCPManager()

# Automatically register built-in reference server
ref_server_path = Path(__file__).parent / "reference_server.py"
if ref_server_path.is_file():
    mcp_manager.register_server(
        MCPServerConfig(
            id="ref-local-01",
            name="Reference MCP Utilities",
            transport="stdio",
            command=sys.executable,
            args=[str(ref_server_path.resolve())],
            enabled=True,
        )
    )
