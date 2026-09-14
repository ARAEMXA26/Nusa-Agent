"""Role definitions for Multi-Agent Workforce (Planner, Coder, Reviewer, Verifier)."""

from enum import Enum
from pydantic import BaseModel, Field


class AgentRole(str, Enum):
    PLANNER = "planner"
    CODER = "coder"
    REVIEWER = "reviewer"
    VERIFIER = "verifier"


class RoleDefinition(BaseModel):
    role: AgentRole
    title: str
    description: str
    system_prompt: str
    allowed_tools: list[str] = Field(default_factory=list)


ROLES: dict[AgentRole, RoleDefinition] = {
    AgentRole.PLANNER: RoleDefinition(
        role=AgentRole.PLANNER,
        title="Planner Agent",
        description="Breaks down complex requirements into a structured Directed Acyclic Graph (DAG) of subtasks.",
        system_prompt=(
            "You are the Planner Agent. Your job is to analyze the user's objective and formulate "
            "an actionable Directed Acyclic Graph (DAG) of subtasks. Identify clear prerequisites "
            "and assign appropriate roles (Coder, Reviewer, Verifier) to each subtask."
        ),
        allowed_tools=["file_read", "file_list", "git_status", "skill_activate", "tool_search_mcp"],
    ),
    AgentRole.CODER: RoleDefinition(
        role=AgentRole.CODER,
        title="Coder Agent",
        description="Implements code modifications and fixes in an isolated workspace/worktree.",
        system_prompt=(
            "You are the Coder Agent. Your job is to make precise, high-quality code changes. "
            "You inspect files, write patches, and avoid destructive actions. "
            "Operate strictly within your assigned isolated workspace."
        ),
        allowed_tools=["file_read", "file_write", "file_patch", "file_list", "git_status", "git_diff"],
    ),
    AgentRole.REVIEWER: RoleDefinition(
        role=AgentRole.REVIEWER,
        title="Reviewer Agent",
        description="Inspects diffs and verifies code quality, security standards, and absence of regressions.",
        system_prompt=(
            "You are the Reviewer Agent. Your job is to conduct rigorous code and security reviews. "
            "Verify that changes are safe, clean, adhere to standards, and do not introduce prompt injections or leaks."
        ),
        allowed_tools=["file_read", "git_status", "git_diff", "skill_activate"],
    ),
    AgentRole.VERIFIER: RoleDefinition(
        role=AgentRole.VERIFIER,
        title="Verifier Agent",
        description="Runs automated test suites on disk and certifies execution correctness.",
        system_prompt=(
            "You are the Verifier Agent. Your job is to execute test commands on disk, capture real test output, "
            "and verify that all assertions pass before work is declared complete."
        ),
        allowed_tools=["run_test", "execute_command", "file_read", "git_status"],
    ),
}


def get_role_definition(role: AgentRole) -> RoleDefinition:
    return ROLES[role]
