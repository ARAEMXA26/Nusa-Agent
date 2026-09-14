"""Tool Registry with schema definitions and dispatching."""

from typing import Any, Callable, Awaitable
from pydantic import BaseModel
from nusa.tools.file_tools import (
    tool_file_read,
    tool_file_write,
    tool_file_patch,
    tool_file_list,
)
from nusa.tools.test_tools import tool_run_test
from nusa.tools.shell_tools import tool_shell_execute
from nusa.tools.git_tools import tool_git_status, tool_git_diff
from nusa.mcp.manager import mcp_manager
from nusa.skills.manager import skill_manager


class ToolParameter(BaseModel):
    name: str
    type: str
    description: str
    required: bool = True


class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: list[ToolParameter]
    parameters_schema: dict[str, Any]


class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, ToolDefinition] = {}
        self._register_default_tools()

    def _register_default_tools(self) -> None:
        self._tools["file_read"] = ToolDefinition(
            name="file_read",
            description="Read the text content of a file inside the workspace safely.",
            parameters=[
                ToolParameter(name="path", type="string", description="Relative path to the file"),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path to the file to read"}
                },
                "required": ["path"],
            },
        )

        self._tools["file_write"] = ToolDefinition(
            name="file_write",
            description="Create or completely overwrite a file in the workspace.",
            parameters=[
                ToolParameter(name="path", type="string", description="Relative path to the file"),
                ToolParameter(name="content", type="string", description="Full content of the file"),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path to the file"},
                    "content": {"type": "string", "description": "Full content of the file"},
                },
                "required": ["path", "content"],
            },
        )

        self._tools["file_patch"] = ToolDefinition(
            name="file_patch",
            description="Apply a targeted find-and-replace edit to an existing file.",
            parameters=[
                ToolParameter(name="path", type="string", description="Relative path to the file"),
                ToolParameter(name="search_content", type="string", description="Exact existing string to replace"),
                ToolParameter(name="replace_content", type="string", description="New replacement string"),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path to the file"},
                    "search_content": {"type": "string", "description": "Exact existing string to replace"},
                    "replace_content": {"type": "string", "description": "New replacement string"},
                },
                "required": ["path", "search_content", "replace_content"],
            },
        )

        self._tools["file_list"] = ToolDefinition(
            name="file_list",
            description="List files and directories in a workspace folder.",
            parameters=[
                ToolParameter(name="path", type="string", description="Relative directory path (defaults to '.')", required=False),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative directory path (defaults to '.')"}
                },
            },
        )

        self._tools["run_test"] = ToolDefinition(
            name="run_test",
            description="Execute verification tests (pytest, npm test, etc.) in the workspace.",
            parameters=[
                ToolParameter(name="command", type="string", description="Test command to run, e.g. 'pytest' or 'npm test'"),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Command to run verification tests"}
                },
                "required": ["command"],
            },
        )

        self._tools["shell_execute"] = ToolDefinition(
            name="shell_execute",
            description="Execute a sandboxed shell command inside the workspace directory.",
            parameters=[
                ToolParameter(name="command", type="string", description="Command to execute"),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Command to execute"}
                },
                "required": ["command"],
            },
        )

        self._tools["git_status"] = ToolDefinition(
            name="git_status",
            description="Get the current git status of the workspace.",
            parameters=[],
            parameters_schema={"type": "object", "properties": {}},
        )

        self._tools["git_diff"] = ToolDefinition(
            name="git_diff",
            description="Get the current git diff of changes in the workspace.",
            parameters=[],
            parameters_schema={"type": "object", "properties": {}},
        )

        self._tools["tool_search_mcp"] = ToolDefinition(
            name="tool_search_mcp",
            description="Search available MCP (Model Context Protocol) external tools on demand.",
            parameters=[
                ToolParameter(name="query", type="string", description="Keywords describing the tool capability to search for"),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Keywords describing the capability"}
                },
                "required": ["query"],
            },
        )

        self._tools["skill_activate"] = ToolDefinition(
            name="skill_activate",
            description="Activate a specific skill from the progressive skills catalog to retrieve its full instructions.",
            parameters=[
                ToolParameter(name="skill_name", type="string", description="Exact name of the skill to activate"),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "skill_name": {"type": "string", "description": "Exact name of the skill to activate"}
                },
                "required": ["skill_name"],
            },
        )

    def get_tool_definitions(self) -> list[ToolDefinition]:
        return list(self._tools.values())

    def get_openai_tools(self, allowed_names: list[str] | None = None) -> list[dict[str, Any]]:
        """Format tools for OpenAI / Anthropic function calling."""
        tools = self._tools.values()
        if allowed_names is not None:
            tools = [t for t in tools if t.name in allowed_names]

        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters_schema,
                },
            }
            for tool in tools
        ]

    async def execute_tool(
        self, workspace_root: str, tool_name: str, arguments: dict[str, Any]
    ) -> dict[str, Any]:
        # Handle MCP Tools (mcp_* or dynamically discovered tools)
        if tool_name.startswith("mcp_") or any(t.name == tool_name for t in mcp_manager.list_all_tools()):
            try:
                res = await mcp_manager.call_tool(tool_name, arguments)
                return {"success": True, "result": res}
            except Exception as e:
                return {"success": False, "error": f"MCP execution error: {e}"}

        if tool_name == "tool_search_mcp":
            matches = mcp_manager.search_tools(arguments.get("query", ""))
            return {
                "success": True,
                "matches": [m.model_dump() for m in matches],
            }
        elif tool_name == "skill_activate":
            instructions = skill_manager.activate_skill_for_goal(arguments.get("skill_name", ""))
            if instructions:
                return {"success": True, "instructions": instructions}
            return {"success": False, "error": f"Skill '{arguments.get('skill_name')}' not found or quarantined."}

        if tool_name not in self._tools:
            return {"success": False, "error": f"Tool '{tool_name}' not found in registry."}

        if tool_name == "file_read":
            return tool_file_read(workspace_root, arguments["path"])
        elif tool_name == "file_write":
            return tool_file_write(workspace_root, arguments["path"], arguments["content"])
        elif tool_name == "file_patch":
            return tool_file_patch(
                workspace_root,
                arguments["path"],
                arguments["search_content"],
                arguments["replace_content"],
            )
        elif tool_name == "file_list":
            return tool_file_list(workspace_root, arguments.get("path", "."))
        elif tool_name == "run_test":
            return await tool_run_test(workspace_root, arguments["command"])
        elif tool_name == "shell_execute":
            return await tool_shell_execute(workspace_root, arguments["command"])
        elif tool_name == "git_status":
            return await tool_git_status(workspace_root)
        elif tool_name == "git_diff":
            return await tool_git_diff(workspace_root)

        return {"success": False, "error": f"Unhandled tool '{tool_name}'"}


tool_registry = ToolRegistry()
