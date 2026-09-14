"""SubAgent executor with isolated context, permission containment, and role enforcement."""

import logging
from typing import Any
from nusa.workforce.dag import SubtaskNode
from nusa.workforce.roles import get_role_definition
from nusa.tools.registry import tool_registry
from nusa.providers.factory import get_provider
from nusa.config import config

logger = logging.getLogger(__name__)


class SubAgentExecutionError(Exception):
    pass


class SubAgent:
    """Executes a single subtask in an isolated context without polluting parent memory."""

    def __init__(self, node: SubtaskNode, workspace_root: str, model_name: str | None = None):
        self.node = node
        self.workspace_root = workspace_root
        self.model_name = model_name or config.default_model
        self.role_def = get_role_definition(node.role)
        self.messages: list[dict[str, Any]] = []

    async def run(self) -> dict[str, Any]:
        """Runs the subagent turn loop up to role objective completion."""
        logger.info(f"SubAgent [{self.node.role.value}] starting for subtask '{self.node.title}' (ID: {self.node.id})")

        # Context Isolation: Scoped system prompt + isolated user goal
        self.messages = [
            {
                "role": "system",
                "content": f"{self.role_def.system_prompt}\nAllowed tools: {', '.join(self.role_def.allowed_tools)}",
            },
            {"role": "user", "content": f"Subtask Goal: {self.node.goal}"},
        ]

        provider = get_provider(self.model_name)
        tools_schema = tool_registry.get_openai_tools(allowed_names=self.role_def.allowed_tools)

        max_iterations = 6
        iteration = 0
        final_summary = ""

        while iteration < max_iterations:
            iteration += 1
            response = await provider.chat_completion(self.messages, tools=tools_schema)

            if response.content:
                self.messages.append({"role": "assistant", "content": response.content})
                final_summary = response.content

            if not response.tool_calls:
                # Subagent concluded work
                break

            # Execute tool calls
            for tc in response.tool_calls:
                tool_name = tc.name
                tool_args = tc.arguments

                # Permission containment: Check if tool is allowed for this role
                if tool_name not in self.role_def.allowed_tools:
                    tool_res = {
                        "success": False,
                        "error": f"Tool '{tool_name}' is not permitted for role '{self.role_def.role.value}'.",
                    }
                else:
                    tool_res = await tool_registry.execute_tool(
                        workspace_root=self.workspace_root,
                        tool_name=tool_name,
                        arguments=tool_args,
                    )

                self.messages.append({
                    "role": "tool",
                    "name": tool_name,
                    "content": str(tool_res),
                })

        if not final_summary:
            final_summary = f"Role [{self.role_def.title}] completed subtask '{self.node.title}' successfully."

        return {
            "subtask_id": self.node.id,
            "role": self.node.role.value,
            "summary": final_summary,
            "iterations": iteration,
        }
