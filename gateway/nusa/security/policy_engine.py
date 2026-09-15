"""Policy Engine implementing DENY > ASK > ALLOW precedence with Skill Least Privilege."""

from enum import Enum
from typing import Any
from pydantic import BaseModel


class PolicyDecision(str, Enum):
    DENY = "deny"
    ASK = "ask"
    ALLOW = "allow"


class PolicyEvaluation(BaseModel):
    decision: PolicyDecision
    reason: str
    requires_approval: bool = False
    action_type: str = ""
    preview: str = ""


DANGEROUS_COMMANDS = [
    "rm -rf /",
    "mkfs",
    "dd if=",
    ":(){ :|:& };:",  # fork bomb
    "sudo",
    "chmod -R 777 /",
    "chown -R",
]


class PolicyEngine:
    def __init__(self, workspace_root: str):
        self.workspace_root = workspace_root

    def evaluate(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        active_skill: Any | None = None,
    ) -> PolicyEvaluation:
        """Evaluates effective permission:
        App Policy ∩ Workspace Trust ∩ Skill Manifest ∩ User Approval ∩ Tool Policy
        Least privilege & Deny by Default: Most restrictive rule always wins.
        """

        # 1. Check for absolute DENY dangerous commands first
        if tool_name in ("shell_execute", "run_command"):
            cmd = arguments.get("command", "")
            for danger in DANGEROUS_COMMANDS:
                if danger in cmd:
                    return PolicyEvaluation(
                        decision=PolicyDecision.DENY,
                        reason=f"Dangerous command pattern detected: '{danger}'",
                        action_type=tool_name,
                        preview=cmd,
                    )

        # 2. Skill Manifest Least-Privilege & Deny by Default
        if active_skill is not None:
            declared_tools = set(active_skill.tools + active_skill.optional_tools)
            # Universal control tools are exempted from declared list
            exempt_tools = {"skill_activate", "tool_search_mcp", "task_state_write"}
            if tool_name not in declared_tools and tool_name not in exempt_tools:
                return PolicyEvaluation(
                    decision=PolicyDecision.DENY,
                    reason=f"Tool '{tool_name}' is not declared in active skill '{active_skill.id}' manifest (Denied by Default).",
                    action_type=tool_name,
                    preview=f"Undeclared tool call: {tool_name}",
                )

            # Check explicit permission gates from manifest
            perms = active_skill.parsed.manifest.permissions

            # Filesystem permission check
            if perms.filesystem == "none" and tool_name in (
                "file_read", "file_list", "file_search", "file_write", "file_patch", "file_delete"
            ):
                return PolicyEvaluation(
                    decision=PolicyDecision.DENY,
                    reason=f"Skill '{active_skill.id}' has filesystem permission 'none'.",
                    action_type=tool_name,
                )

            if perms.filesystem == "read" and tool_name in ("file_write", "file_patch", "file_delete"):
                return PolicyEvaluation(
                    decision=PolicyDecision.DENY,
                    reason=f"Skill '{active_skill.id}' has read-only filesystem permission; mutation rejected.",
                    action_type=tool_name,
                )

            # Shell permission check
            if perms.shell == "none" and tool_name in ("shell_execute", "run_command"):
                return PolicyEvaluation(
                    decision=PolicyDecision.DENY,
                    reason=f"Skill '{active_skill.id}' has shell permission 'none'.",
                    action_type=tool_name,
                )

            # Network permission check
            if perms.network == "none" and tool_name in (
                "browser_navigate", "browser_open", "web_search", "web_open"
            ):
                return PolicyEvaluation(
                    decision=PolicyDecision.DENY,
                    reason=f"Skill '{active_skill.id}' has network permission 'none'.",
                    action_type=tool_name,
                )

            # Computer control permission check
            if perms.computerControl == "none" and tool_name in (
                "screen_view", "screen_capture", "system_keypress", "system_mouse_click",
                "mouse_control", "keyboard_control"
            ):
                return PolicyEvaluation(
                    decision=PolicyDecision.DENY,
                    reason=f"Skill '{active_skill.id}' has computerControl permission 'none'.",
                    action_type=tool_name,
                )

            # Check requiresApprovalFor declared in skill
            for req in active_skill.parsed.manifest.requiresApprovalFor:
                if req == tool_name or req in str(arguments):
                    return PolicyEvaluation(
                        decision=PolicyDecision.ASK,
                        reason=f"Operation '{tool_name}' explicitly requires approval under skill '{active_skill.id}'.",
                        requires_approval=True,
                        action_type=tool_name,
                        preview=str(arguments),
                    )

        # 3. Standard Human Approval (ASK) Gates
        # Destructive file actions
        if tool_name in ("file_write", "file_patch", "file_delete"):
            target = arguments.get("path", "")
            patch_preview = arguments.get("replace_content", "") or arguments.get("content", "")
            if len(patch_preview) > 200:
                patch_preview = patch_preview[:200] + "..."
            return PolicyEvaluation(
                decision=PolicyDecision.ASK,
                reason=f"File mutation operation on '{target}' requires human approval",
                requires_approval=True,
                action_type=tool_name,
                preview=f"Tool: {tool_name} on {target}\nContent preview:\n{patch_preview}",
            )

        # Host shell execution
        if tool_name in ("shell_execute", "run_command"):
            cmd = arguments.get("command", "")
            return PolicyEvaluation(
                decision=PolicyDecision.ASK,
                reason="Shell command execution requires human approval",
                requires_approval=True,
                action_type=tool_name,
                preview=f"$ {cmd}",
            )

        # External web navigation
        if tool_name in ("browser_navigate", "browser_open"):
            url = arguments.get("url", "")
            return PolicyEvaluation(
                decision=PolicyDecision.ASK,
                reason="Navigating to external web page requires human approval",
                requires_approval=True,
                action_type=tool_name,
                preview=f"Target URL: {url}",
            )

        # Computer Control (Screen, Mouse, Keyboard)
        if tool_name in (
            "screen_capture", "screen_view", "system_keypress", "system_mouse_click",
            "mouse_control", "keyboard_control"
        ):
            desc = (
                "Capture desktop display"
                if "screen" in tool_name
                else f"Key input '{arguments.get('key')}'"
                if "key" in tool_name
                else f"Mouse click at ({arguments.get('x')}, {arguments.get('y')})"
            )
            return PolicyEvaluation(
                decision=PolicyDecision.ASK,
                reason="Operating system computer-use action requires human authorization",
                requires_approval=True,
                action_type=tool_name,
                preview=f"Computer Action: {tool_name} | {desc}",
            )

        # Git push, PR creation, publish actions
        if tool_name in ("git_push", "pull_request_create"):
            return PolicyEvaluation(
                decision=PolicyDecision.ASK,
                reason=f"Publishing changes ({tool_name}) requires human authorization",
                requires_approval=True,
                action_type=tool_name,
                preview=f"Action: {tool_name} with {arguments}",
            )

        # Automation schedule creation or deletion
        if tool_name in ("automation_create", "automation_delete"):
            return PolicyEvaluation(
                decision=PolicyDecision.ASK,
                reason=f"Scheduling automation action '{tool_name}' requires human authorization",
                requires_approval=True,
                action_type=tool_name,
                preview=f"Automation Action: {tool_name}",
            )

        # Plugin or MCP install/remove
        if tool_name in ("plugin_install", "plugin_remove", "plugin_update"):
            return PolicyEvaluation(
                decision=PolicyDecision.ASK,
                reason=f"Plugin management '{tool_name}' requires human authorization",
                requires_approval=True,
                action_type=tool_name,
                preview=f"Plugin: {arguments.get('name') or arguments.get('id')}",
            )

        # 4. Safe read-only tools default to ALLOW
        safe_read_tools = {
            "file_read",
            "file_list",
            "file_search",
            "symbol_search",
            "git_status",
            "git_diff",
            "git_log",
            "run_test",
            "browser_snapshot",
            "browser_inspect",
            "browser_click",
            "browser_type",
            "browser_screenshot",
            "tool_search_mcp",
            "skill_activate",
            "memory_search",
            "memory_read",
            "memory_list",
            "automation_list",
            "plugin_list",
            "plugin_inspect",
            "workspace_read",
            "document_read",
            "pdf_read",
            "spreadsheet_read",
            "slides_read",
            "chart_render",
            "data_query",
            "web_search",
            "web_open",
            "web_find",
            "secret_scan",
            "dependency_scan",
            "static_analysis",
            "skill_validate",
            "skill_test",
        }

        if tool_name in safe_read_tools:
            return PolicyEvaluation(
                decision=PolicyDecision.ALLOW,
                reason="Safe read or inspection operation inside workspace",
                requires_approval=False,
                action_type=tool_name,
            )

        # Default fallback is ASK for any unknown tool
        return PolicyEvaluation(
            decision=PolicyDecision.ASK,
            reason=f"Unrecognized tool '{tool_name}' defaults to requiring approval",
            requires_approval=True,
            action_type=tool_name,
        )
