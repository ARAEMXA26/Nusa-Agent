"""REST endpoints for Model Context Protocol (MCP) Management."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from nusa.mcp.manager import mcp_manager, MCPServerConfig

router = APIRouter(prefix="/api/mcp", tags=["mcp"])


class RegisterServerRequest(BaseModel):
    id: str
    name: str
    transport: str = "stdio"
    command: str = ""
    args: list[str] = []
    url: str = ""


class QuarantineRequest(BaseModel):
    reason: str


class ToolSearchRequest(BaseModel):
    query: str
    limit: int = 10


@router.get("/servers")
def list_servers():
    return [s.model_dump() for s in mcp_manager.list_servers()]


@router.post("/servers")
def register_server(req: RegisterServerRequest):
    config = MCPServerConfig(
        id=req.id,
        name=req.name,
        transport=req.transport,
        command=req.command,
        args=req.args,
        url=req.url,
        enabled=True,
    )
    mcp_manager.register_server(config)
    return {"status": "registered", "server": config.model_dump()}


@router.post("/servers/{server_id}/start")
async def start_server(server_id: str):
    success = await mcp_manager.start_server(server_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start MCP server or server is quarantined.")
    return {"status": "started", "server_id": server_id}


@router.post("/servers/{server_id}/quarantine")
def quarantine_server(server_id: str, req: QuarantineRequest):
    mcp_manager.quarantine_server(server_id, reason=req.reason)
    return {"status": "quarantined", "server_id": server_id, "reason": req.reason}


@router.get("/tools")
def list_tools():
    return [t.model_dump() for t in mcp_manager.list_all_tools()]


@router.post("/tools/search")
def search_tools(req: ToolSearchRequest):
    matches = mcp_manager.search_tools(req.query, limit=req.limit)
    return [m.model_dump() for m in matches]
