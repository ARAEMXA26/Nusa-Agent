"""Model Context Protocol (MCP) Client supporting stdio and HTTP/SSE transports."""

import asyncio
import json
import logging
from typing import Any
import httpx

logger = logging.getLogger(__name__)


class MCPClientError(Exception):
    pass


class MCPClient:
    """Async client communicating with an MCP Server via JSON-RPC 2.0."""

    def __init__(self, server_id: str, name: str):
        self.server_id = server_id
        self.name = name
        self._process: asyncio.subprocess.Process | None = None
        self._pending_requests: dict[int, asyncio.Future] = {}
        self._request_counter = 0
        self._reader_task: asyncio.Task | None = None
        self._is_connected = False
        self._transport = "stdio"  # "stdio" or "http"
        self._http_url: str | None = None

    @property
    def is_connected(self) -> bool:
        return self._is_connected

    async def connect_stdio(self, command: str, args: list[str], env: dict[str, str] | None = None) -> None:
        """Launches a local stdio MCP subprocess."""
        cmd = [command] + args
        self._transport = "stdio"
        try:
            self._process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            self._is_connected = True
            self._reader_task = asyncio.create_task(self._stdio_reader_loop())
            logger.info(f"MCP client {self.name} connected via stdio: {' '.join(cmd)}")
        except Exception as e:
            self._is_connected = False
            raise MCPClientError(f"Failed to start MCP stdio server: {e}") from e

    async def connect_http(self, url: str) -> None:
        """Connects to a remote HTTP/SSE MCP server endpoint."""
        self._transport = "http"
        self._http_url = url
        self._is_connected = True

    async def _stdio_reader_loop(self) -> None:
        if not self._process or not self._process.stdout:
            return

        while self._is_connected and not self._process.stdout.at_eof():
            try:
                line = await self._process.stdout.readline()
                if not line:
                    break
                text = line.decode("utf-8").strip()
                if not text:
                    continue

                response = json.loads(text)
                req_id = response.get("id")
                if req_id is not None and req_id in self._pending_requests:
                    future = self._pending_requests.pop(req_id)
                    if not future.done():
                        if "error" in response:
                            future.set_exception(MCPClientError(response["error"].get("message", "Unknown MCP error")))
                        else:
                            future.set_result(response.get("result", {}))
            except json.JSONDecodeError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Error in MCP reader loop: {e}")
                break

        self._is_connected = False

    async def _send_request(self, method: str, params: dict[str, Any] | None = None, timeout: float = 15.0) -> dict[str, Any]:
        if not self._is_connected:
            raise MCPClientError(f"MCP client {self.name} is not connected.")

        if self._transport == "http":
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(
                    f"{self._http_url}/jsonrpc",
                    json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}},
                )
                data = resp.json()
                if "error" in data:
                    raise MCPClientError(data["error"].get("message", "HTTP MCP error"))
                return data.get("result", {})

        # Stdio transport
        self._request_counter += 1
        req_id = self._request_counter
        payload = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params or {},
        }

        loop = asyncio.get_running_loop()
        future = loop.create_future()
        self._pending_requests[req_id] = future

        msg = json.dumps(payload) + "\n"
        if self._process and self._process.stdin:
            self._process.stdin.write(msg.encode("utf-8"))
            await self._process.stdin.drain()
        else:
            raise MCPClientError("Stdin is not available")

        try:
            return await asyncio.wait_for(future, timeout=timeout)
        except asyncio.TimeoutError:
            self._pending_requests.pop(req_id, None)
            raise MCPClientError(f"MCP request timed out ({timeout}s): {method}")

    async def initialize(self) -> dict[str, Any]:
        params = {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {}},
            "clientInfo": {"name": "nusa-agent", "version": "0.1.0"},
        }
        return await self._send_request("initialize", params)

    async def list_tools(self) -> list[dict[str, Any]]:
        result = await self._send_request("tools/list", {})
        return result.get("tools", [])

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        params = {"name": tool_name, "arguments": arguments}
        result = await self._send_request("tools/call", params)
        return result

    async def close(self) -> None:
        self._is_connected = False
        if self._reader_task and not self._reader_task.done():
            self._reader_task.cancel()

        if self._process:
            try:
                if self._process.stdin:
                    self._process.stdin.close()
                    await self._process.stdin.wait_closed()
            except Exception:
                pass
            try:
                self._process.terminate()
                await asyncio.wait_for(self._process.wait(), timeout=1.0)
            except Exception:
                try:
                    self._process.kill()
                    await asyncio.wait_for(self._process.wait(), timeout=1.0)
                except Exception:
                    pass
            self._process = None
