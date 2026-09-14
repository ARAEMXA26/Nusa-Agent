"""Policy Engine implementing DENY > ASK > ALLOW precedence."""

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

    def evaluate(self, tool_name: str, arguments: dict[str, Any]) -> PolicyEvaluation:
        # 1. Check for absolute DENY rules first
        if tool_name == "shell_execute":
            cmd = arguments.get("command", "")
            for danger in DANGEROUS_COMMANDS:
                if danger in cmd:
                    return PolicyEvaluation(
                        decision=PolicyDecision.DENY,
                        reason=f"Dangerous command pattern detected: '{danger}'",
                        action_type=tool_name,
                        preview=cmd,
                    )

        # 2. Check for ASK rules (Mutations and Shell execution)
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

        if tool_name == "shell_execute":
            cmd = arguments.get("command", "")
            return PolicyEvaluation(
                decision=PolicyDecision.ASK,
                reason=f"Shell command execution requires human approval",
                requires_approval=True,
                action_type=tool_name,
                preview=f"$ {cmd}",
            )

        # 3. Read-only tools default to ALLOW (verified inside workspace)
        if tool_name in ("file_read", "file_list", "file_search", "git_status", "git_diff", "run_test"):
            return PolicyEvaluation(
                decision=PolicyDecision.ALLOW,
                reason="Safe read/verification operation inside workspace",
                requires_approval=False,
                action_type=tool_name,
            )

        # Default fallback is ASK for unknown tools
        return PolicyEvaluation(
            decision=PolicyDecision.ASK,
            reason=f"Unrecognized tool '{tool_name}' defaults to requiring approval",
            requires_approval=True,
            action_type=tool_name,
        )
