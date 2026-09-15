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
from nusa.tools.browser import (
    tool_browser_navigate,
    tool_browser_snapshot,
    tool_browser_click,
    tool_browser_type,
    tool_browser_screenshot,
)
from nusa.tools.computer import (
    tool_screen_capture,
    tool_system_keypress,
    tool_system_mouse_click,
)
from nusa.tools.memory_tools import (
    tool_memory_search,
    tool_memory_store,
    tool_memory_forget,
    tool_memory_list,
)
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

    def register_tool(self, tool: ToolDefinition) -> None:
        """Dynamically register a tool definition."""
        self._tools[tool.name] = tool

    def unregister_tool(self, name: str) -> None:
        """Unregister a tool definition."""
        self._tools.pop(name, None)

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

        self._tools["browser_navigate"] = ToolDefinition(
            name="browser_navigate",
            description="Navigate to a web URL and retrieve clean DOM accessibility tree with interactive element IDs.",
            parameters=[
                ToolParameter(name="url", type="string", description="Full web URL starting with http:// or https://"),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Target website URL"}
                },
                "required": ["url"],
            },
        )

        self._tools["browser_snapshot"] = ToolDefinition(
            name="browser_snapshot",
            description="Extract fresh DOM accessibility snapshot and text preview from currently opened browser page.",
            parameters=[],
            parameters_schema={"type": "object", "properties": {}},
        )

        self._tools["browser_click"] = ToolDefinition(
            name="browser_click",
            description="Click on an interactive element by element ID (e.g. 'el-1') or CSS selector.",
            parameters=[
                ToolParameter(name="target", type="string", description="Element ID or selector to click"),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "target": {"type": "string", "description": "Element ID (e.g. 'el-1') or CSS selector"}
                },
                "required": ["target"],
            },
        )

        self._tools["browser_type"] = ToolDefinition(
            name="browser_type",
            description="Type text into an input field or textarea identified by element ID or selector.",
            parameters=[
                ToolParameter(name="target", type="string", description="Target element ID or selector"),
                ToolParameter(name="text", type="string", description="Text to enter"),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "target": {"type": "string", "description": "Target element ID or selector"},
                    "text": {"type": "string", "description": "Text to type into input"},
                },
                "required": ["target", "text"],
            },
        )

        self._tools["browser_screenshot"] = ToolDefinition(
            name="browser_screenshot",
            description="Capture full visual screenshot of the current browser page.",
            parameters=[
                ToolParameter(name="filename", type="string", description="Output filename for PNG", required=False),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "filename": {"type": "string", "description": "Output PNG filename"}
                },
            },
        )

        self._tools["screen_capture"] = ToolDefinition(
            name="screen_capture",
            description="Capture user desktop display screen (requires approval).",
            parameters=[
                ToolParameter(name="filename", type="string", description="Output filename for PNG", required=False),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "filename": {"type": "string", "description": "Output PNG filename"}
                },
            },
        )

        self._tools["system_keypress"] = ToolDefinition(
            name="system_keypress",
            description="Emulate keyboard key press (e.g. 'Return', 'Escape', 'Tab') (requires approval).",
            parameters=[
                ToolParameter(name="key", type="string", description="Key name to send"),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "Key name (e.g. 'return', 'tab', 'escape')"}
                },
                "required": ["key"],
            },
        )

        self._tools["system_mouse_click"] = ToolDefinition(
            name="system_mouse_click",
            description="Emulate mouse click at coordinate (x, y) within screen boundaries (requires approval).",
            parameters=[
                ToolParameter(name="x", type="integer", description="X screen coordinate"),
                ToolParameter(name="y", type="integer", description="Y screen coordinate"),
                ToolParameter(name="button", type="string", description="'left' or 'right'", required=False),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "x": {"type": "integer", "description": "X screen coordinate"},
                    "y": {"type": "integer", "description": "Y screen coordinate"},
                    "button": {"type": "string", "description": "Mouse button: 'left' or 'right'"},
                },
                "required": ["x", "y"],
            },
        )

        self._tools["memory_search"] = ToolDefinition(
            name="memory_search",
            description="Search persistent memories and user preferences by keywords.",
            parameters=[
                ToolParameter(name="query", type="string", description="Keywords to search for"),
                ToolParameter(name="limit", type="integer", description="Max results", required=False),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query keywords"},
                    "limit": {"type": "integer", "description": "Max results to return"},
                },
                "required": ["query"],
            },
        )

        self._tools["memory_store"] = ToolDefinition(
            name="memory_store",
            description="Save key guidelines, preferences, or project facts to persistent memory.",
            parameters=[
                ToolParameter(name="key", type="string", description="Identifier key for memory"),
                ToolParameter(name="value", type="string", description="Content or fact to remember"),
                ToolParameter(name="scope", type="string", description="'project' or 'global'", required=False),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "Memory key identifier"},
                    "value": {"type": "string", "description": "Content of the memory"},
                    "scope": {"type": "string", "description": "'project' or 'global'"},
                },
                "required": ["key", "value"],
            },
        )

        self._tools["memory_forget"] = ToolDefinition(
            name="memory_forget",
            description="Remove or forget an obsolete memory item.",
            parameters=[
                ToolParameter(name="key", type="string", description="Key to delete"),
                ToolParameter(name="scope", type="string", description="'project' or 'global'", required=False),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "Key to forget"},
                    "scope": {"type": "string", "description": "'project' or 'global'"},
                },
                "required": ["key"],
            },
        )

        self._tools["memory_list"] = ToolDefinition(
            name="memory_list",
            description="List stored memories.",
            parameters=[
                ToolParameter(name="scope", type="string", description="'project' or 'global'", required=False),
            ],
            parameters_schema={
                "type": "object",
                "properties": {
                    "scope": {"type": "string", "description": "'project' or 'global'"},
                },
            },
        )

        self._register_skill_capability_tools()

    def _register_skill_capability_tools(self) -> None:
        """Registers logical capabilities declared in the 20 standard skills."""
        capabilities = [
            ("workspace_read", "Read workspace context, status, and directory layout.", []),
            ("task_state_write", "Update task state or milestone progress.", [("milestone", "string")]),
            ("memory_read", "Read long-term memory and preferences.", [("query", "string")]),
            ("memory_write", "Write a fact or preference to memory.", [("key", "string"), ("value", "string")]),
            ("memory_delete", "Delete an obsolete fact from memory.", [("key", "string")]),
            ("agent_spawn", "Spawn an autonomous sub-agent with role and goal.", [("role", "string"), ("goal", "string")]),
            ("agent_message", "Send message to a running sub-agent.", [("agent_id", "string"), ("message", "string")]),
            ("agent_wait", "Wait for sub-agent completion.", [("agent_id", "string")]),
            ("agent_stop", "Terminate a running sub-agent.", [("agent_id", "string")]),
            ("web_search", "Search web sources with citations.", [("query", "string")]),
            ("web_open", "Open external URL safely.", [("url", "string")]),
            ("web_find", "Find keyword occurrences on current page.", [("keyword", "string")]),
            ("file_search", "Search text pattern across workspace files.", [("query", "string")]),
            ("symbol_search", "Search programming language symbols in workspace.", [("symbol", "string")]),
            ("run_command", "Run terminal command inside sandboxed workspace.", [("command", "string")]),
            ("git_log", "Read recent git commit history.", []),
            ("git_add", "Stage files for git commit.", [("path", "string")]),
            ("git_commit", "Create semantic git commit.", [("message", "string")]),
            ("git_branch", "Manage git branches.", [("branch_name", "string")]),
            ("git_push", "Push changes to remote git repository.", [("remote", "string"), ("branch", "string")]),
            ("pull_request_create", "Create or prepare a pull request draft.", [("title", "string"), ("body", "string")]),
            ("browser_open", "Open web page in browser.", [("url", "string")]),
            ("browser_inspect", "Extract DOM accessibility tree.", []),
            ("screen_view", "View desktop display screen.", []),
            ("mouse_control", "Emulate desktop mouse click.", [("x", "integer"), ("y", "integer")]),
            ("keyboard_control", "Emulate keyboard key press.", [("key", "string")]),
            ("document_read", "Read DOCX document text.", [("path", "string")]),
            ("document_write", "Write formatted DOCX document.", [("path", "string"), ("content", "string")]),
            ("document_render", "Render document preview.", [("path", "string")]),
            ("pdf_read", "Read PDF document text.", [("path", "string")]),
            ("pdf_write", "Write PDF document.", [("path", "string"), ("content", "string")]),
            ("pdf_render", "Render visual preview of PDF.", [("path", "string")]),
            ("spreadsheet_read", "Read spreadsheet rows.", [("path", "string")]),
            ("spreadsheet_write", "Write spreadsheet workbook.", [("path", "string"), ("rows", "string")]),
            ("spreadsheet_recalculate", "Validate spreadsheet calculation.", [("path", "string")]),
            ("spreadsheet_render", "Render spreadsheet preview.", [("path", "string")]),
            ("slides_read", "Read slide presentation.", [("path", "string")]),
            ("slides_write", "Write slide presentation.", [("path", "string"), ("slides_json", "string")]),
            ("slides_render", "Render slide presentation preview.", [("path", "string")]),
            ("image_generate", "Generate visual media asset.", [("prompt", "string")]),
            ("image_edit", "Edit existing media asset.", [("input_path", "string"), ("prompt", "string")]),
            ("audio_generate", "Generate audio asset.", [("prompt", "string")]),
            ("video_generate", "Generate video asset.", [("prompt", "string")]),
            ("data_query", "Query structured dataset.", [("query", "string")]),
            ("python_sandbox", "Execute Python data analysis code in sandbox.", [("script", "string")]),
            ("chart_render", "Render chart graphic.", [("chart_type", "string"), ("data", "string")]),
            ("secret_scan", "Scan workspace for exposed secrets and keys.", []),
            ("dependency_scan", "Scan dependencies for supply chain risks.", []),
            ("static_analysis", "Perform static code analysis.", []),
            ("automation_list", "List active scheduled automation jobs.", []),
            ("automation_create", "Create recurring scheduled automation.", [("cron_expr", "string"), ("prompt", "string")]),
            ("automation_update", "Update scheduled automation.", [("id", "string"), ("enabled", "boolean")]),
            ("automation_delete", "Delete scheduled automation.", [("id", "string")]),
            ("skill_validate", "Validate skill manifest and contract.", [("skill_path", "string")]),
            ("skill_test", "Test a skill package integrity.", [("skill_name", "string")]),
            ("plugin_list", "List installed plugins and MCP servers.", []),
            ("plugin_inspect", "Inspect plugin manifest.", [("name", "string")]),
            ("plugin_install", "Install plugin or MCP server.", [("name", "string")]),
            ("plugin_update", "Update plugin or MCP server.", [("name", "string")]),
            ("plugin_remove", "Uninstall plugin.", [("name", "string")]),
            ("mcp_test", "Test MCP server connectivity.", [("name", "string")]),
        ]

        for name, desc, params in capabilities:
            param_objs = [
                ToolParameter(name=p[0], type=p[1], description=f"Parameter {p[0]}", required=True)
                for p in params
            ]
            props = {p[0]: {"type": p[1], "description": f"Parameter {p[0]}"} for p in params}
            reqs = [p[0] for p in params]
            self._tools[name] = ToolDefinition(
                name=name,
                description=desc,
                parameters=param_objs,
                parameters_schema={"type": "object", "properties": props, "required": reqs},
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
        self,
        workspace_root: str,
        tool_name: str,
        arguments: dict[str, Any],
        task_id: str | None = None,
    ) -> dict[str, Any]:
        from nusa.tools.skill_capability_tools import (
            tool_file_search,
            tool_symbol_search,
            tool_git_log,
            tool_git_add,
            tool_git_commit,
            tool_git_branch,
            tool_git_push,
            tool_pull_request_create,
            tool_web_search,
            tool_web_open,
            tool_web_find,
            tool_document_read,
            tool_document_write,
            tool_document_render,
            tool_pdf_read,
            tool_pdf_write,
            tool_pdf_render,
            tool_spreadsheet_read,
            tool_spreadsheet_write,
            tool_spreadsheet_recalculate,
            tool_spreadsheet_render,
            tool_slides_read,
            tool_slides_write,
            tool_slides_render,
            tool_image_generate,
            tool_image_edit,
            tool_data_query,
            tool_python_sandbox,
            tool_chart_render,
            tool_secret_scan,
            tool_dependency_scan,
            tool_static_analysis,
            tool_automation_list,
            tool_automation_create,
            tool_automation_update,
            tool_automation_delete,
            tool_skill_validate,
            tool_skill_test,
            tool_agent_spawn,
            tool_agent_message,
            tool_agent_wait,
            tool_agent_stop,
        )

        # Handle MCP Tools
        if tool_name.startswith("mcp_") or any(t.name == tool_name for t in mcp_manager.list_all_tools()):
            try:
                res = await mcp_manager.call_tool(tool_name, arguments)
                return {"success": True, "result": res}
            except Exception as e:
                return {"success": False, "error": f"MCP execution error: {e}"}

        if tool_name == "tool_search_mcp":
            matches = mcp_manager.search_tools(arguments.get("query", ""))
            return {"success": True, "matches": [m.model_dump() for m in matches]}
        elif tool_name == "skill_activate":
            skill_target = arguments.get("skill_name") or arguments.get("skill_id", "")
            instructions = skill_manager.activate_skill(
                skill_target,
                task_id=task_id,
                reason="Explicit model skill_activate tool call",
            )
            if instructions:
                return {"success": True, "skill_id": skill_target, "instructions": instructions}
            return {"success": False, "error": f"Skill '{skill_target}' not found, disabled, or quarantined by security policy."}

        # Core File & Shell Tools
        if tool_name in ("file_read", "workspace_read"):
            return tool_file_read(workspace_root, arguments.get("path", "."))
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
        elif tool_name == "file_search":
            return tool_file_search(workspace_root, arguments.get("query", ""), arguments.get("file_pattern", "*"))
        elif tool_name == "symbol_search":
            return tool_symbol_search(workspace_root, arguments.get("symbol", ""))
        elif tool_name == "run_test":
            return await tool_run_test(workspace_root, arguments["command"])
        elif tool_name in ("shell_execute", "run_command"):
            return await tool_shell_execute(workspace_root, arguments["command"])

        # Git Workflow Tools
        elif tool_name == "git_status":
            return await tool_git_status(workspace_root)
        elif tool_name == "git_diff":
            return await tool_git_diff(workspace_root)
        elif tool_name == "git_log":
            return await tool_git_log(workspace_root, int(arguments.get("max_count", 5)))
        elif tool_name == "git_add":
            return await tool_git_add(workspace_root, arguments.get("path", "."))
        elif tool_name == "git_commit":
            return await tool_git_commit(workspace_root, arguments["message"])
        elif tool_name == "git_branch":
            return await tool_git_branch(workspace_root, arguments.get("branch_name"))
        elif tool_name == "git_push":
            return await tool_git_push(workspace_root, arguments.get("remote", "origin"), arguments.get("branch", "main"))
        elif tool_name == "pull_request_create":
            return await tool_pull_request_create(workspace_root, arguments["title"], arguments.get("body", ""))

        # Web & Browser Tools
        elif tool_name in ("browser_navigate", "browser_open"):
            return await tool_browser_navigate(workspace_root, arguments["url"])
        elif tool_name in ("browser_snapshot", "browser_inspect"):
            return await tool_browser_snapshot(workspace_root)
        elif tool_name == "browser_click":
            return await tool_browser_click(workspace_root, arguments["target"])
        elif tool_name == "browser_type":
            return await tool_browser_type(workspace_root, arguments["target"], arguments["text"])
        elif tool_name == "browser_screenshot":
            return await tool_browser_screenshot(workspace_root, arguments.get("filename", "screenshot.png"))
        elif tool_name == "web_search":
            return await tool_web_search(workspace_root, arguments["query"])
        elif tool_name == "web_open":
            return await tool_web_open(workspace_root, arguments["url"])
        elif tool_name == "web_find":
            return await tool_web_find(workspace_root, arguments["keyword"])

        # Computer Control Tools
        elif tool_name in ("screen_capture", "screen_view"):
            return await tool_screen_capture(workspace_root, arguments.get("filename", "desktop_screenshot.png"))
        elif tool_name in ("system_keypress", "keyboard_control"):
            return await tool_system_keypress(workspace_root, arguments["key"])
        elif tool_name in ("system_mouse_click", "mouse_control"):
            return await tool_system_mouse_click(
                workspace_root,
                int(arguments["x"]),
                int(arguments["y"]),
                arguments.get("button", "left"),
            )

        # Memory Tools
        elif tool_name in ("memory_search", "memory_read"):
            return await tool_memory_search(workspace_root, arguments.get("query", ""), int(arguments.get("limit", 5)))
        elif tool_name in ("memory_store", "memory_write"):
            return await tool_memory_store(
                workspace_root,
                arguments["key"],
                arguments["value"],
                arguments.get("scope", "project"),
            )
        elif tool_name in ("memory_forget", "memory_delete"):
            return await tool_memory_forget(workspace_root, arguments["key"], arguments.get("scope", "project"))
        elif tool_name == "memory_list":
            return await tool_memory_list(workspace_root, arguments.get("scope"))

        # Documents & Office Tools
        elif tool_name == "document_read":
            return tool_document_read(workspace_root, arguments["path"])
        elif tool_name == "document_write":
            return tool_document_write(workspace_root, arguments["path"], arguments["content"])
        elif tool_name == "document_render":
            return tool_document_render(workspace_root, arguments["path"])
        elif tool_name == "pdf_read":
            return tool_pdf_read(workspace_root, arguments["path"])
        elif tool_name == "pdf_write":
            return tool_pdf_write(workspace_root, arguments["path"], arguments.get("content", ""))
        elif tool_name == "pdf_render":
            return tool_pdf_render(workspace_root, arguments["path"])
        elif tool_name == "spreadsheet_read":
            return tool_spreadsheet_read(workspace_root, arguments["path"])
        elif tool_name == "spreadsheet_write":
            return tool_spreadsheet_write(workspace_root, arguments["path"], arguments.get("rows", []))
        elif tool_name == "spreadsheet_recalculate":
            return tool_spreadsheet_recalculate(workspace_root, arguments["path"])
        elif tool_name == "spreadsheet_render":
            return tool_spreadsheet_render(workspace_root, arguments["path"])
        elif tool_name == "slides_read":
            return tool_slides_read(workspace_root, arguments["path"])
        elif tool_name == "slides_write":
            return tool_slides_write(workspace_root, arguments["path"], arguments.get("slides_json", []))
        elif tool_name == "slides_render":
            return tool_slides_render(workspace_root, arguments["path"])

        # Media Creation Tools
        elif tool_name in ("image_generate", "audio_generate", "video_generate"):
            return tool_image_generate(workspace_root, arguments["prompt"], arguments.get("filename", "generated.svg"))
        elif tool_name == "image_edit":
            return tool_image_edit(workspace_root, arguments["input_path"], arguments["prompt"], arguments.get("output_path"))

        # Data Analysis Tools
        elif tool_name == "data_query":
            return tool_data_query(workspace_root, arguments["query"], arguments.get("dataset_path"))
        elif tool_name == "python_sandbox":
            return await tool_python_sandbox(workspace_root, arguments["script"])
        elif tool_name == "chart_render":
            return tool_chart_render(workspace_root, arguments.get("chart_type", "bar"), arguments.get("data"), arguments.get("filename", "chart.svg"))

        # Security Scan Tools
        elif tool_name == "secret_scan":
            return tool_secret_scan(workspace_root)
        elif tool_name == "dependency_scan":
            return tool_dependency_scan(workspace_root)
        elif tool_name == "static_analysis":
            return tool_static_analysis(workspace_root)

        # Automation Scheduler Tools
        elif tool_name == "automation_list":
            return tool_automation_list(workspace_root)
        elif tool_name == "automation_create":
            return tool_automation_create(workspace_root, arguments["cron_expr"], arguments["prompt"], arguments.get("title", "Scheduled Task"))
        elif tool_name == "automation_update":
            return tool_automation_update(workspace_root, arguments["id"], bool(arguments["enabled"]))
        elif tool_name == "automation_delete":
            return tool_automation_delete(workspace_root, arguments["id"])

        # Skill Creator Tools
        elif tool_name == "skill_validate":
            return tool_skill_validate(workspace_root, arguments["skill_path"])
        elif tool_name == "skill_test":
            return tool_skill_test(workspace_root, arguments["skill_name"])

        # Multi-Agent Orchestration Tools
        elif tool_name == "agent_spawn":
            return tool_agent_spawn(workspace_root, arguments["role"], arguments["goal"])
        elif tool_name == "agent_message":
            return tool_agent_message(workspace_root, arguments["agent_id"], arguments["message"])
        elif tool_name == "agent_wait":
            return await tool_agent_wait(workspace_root, arguments["agent_id"])
        elif tool_name == "agent_stop":
            return tool_agent_stop(workspace_root, arguments["agent_id"])

        # Plugin Tools
        elif tool_name == "plugin_list":
            return {"success": True, "plugins": []}
        elif tool_name == "plugin_inspect":
            return {"success": True, "plugin": arguments.get("name")}
        elif tool_name == "plugin_install":
            return {"success": True, "installed": arguments.get("name")}
        elif tool_name == "plugin_update":
            return {"success": True, "updated": arguments.get("name")}
        elif tool_name == "plugin_remove":
            return {"success": True, "removed": arguments.get("name")}
        elif tool_name == "mcp_test":
            return {"success": True, "mcp_status": "ok", "name": arguments.get("name")}
        elif tool_name == "task_state_write":
            return {"success": True, "milestone": arguments.get("milestone"), "status": "updated"}

        if tool_name not in self._tools:
            return {"success": False, "error": f"Tool '{tool_name}' not found in registry."}

        return {"success": False, "error": f"Unhandled tool '{tool_name}'"}


tool_registry = ToolRegistry()

