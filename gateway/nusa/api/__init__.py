"""API package for Nusa Agent."""

from nusa.api.routes_projects import router as projects_router
from nusa.api.routes_tasks import router as tasks_router
from nusa.api.routes_approvals import router as approvals_router
from nusa.api.routes_artifacts import router as artifacts_router
from nusa.api.routes_settings import router as settings_router
from nusa.api.routes_skills import router as skills_router
from nusa.api.routes_mcp import router as mcp_router
from nusa.api.routes_workforce import router as workforce_router
from nusa.api.routes_browser import router as browser_router
from nusa.api.routes_memory import router as memory_router
from nusa.api.routes_profiles import router as profiles_router
from nusa.api.routes_cron import router as cron_router
from nusa.api.routes_plugins import router as plugins_router
from nusa.api.routes_extensions import router as extensions_router
from nusa.api.routes_workspace import router as workspace_router
from nusa.api.websocket import router as websocket_router

__all__ = [
    "projects_router",
    "workspace_router",
    "tasks_router",
    "approvals_router",
    "artifacts_router",
    "settings_router",
    "skills_router",
    "mcp_router",
    "workforce_router",
    "browser_router",
    "memory_router",
    "profiles_router",
    "cron_router",
    "plugins_router",
    "extensions_router",
    "websocket_router",
]
