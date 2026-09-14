"""API package for Nusa Agent."""

from nusa.api.routes_projects import router as projects_router
from nusa.api.routes_tasks import router as tasks_router
from nusa.api.routes_approvals import router as approvals_router
from nusa.api.routes_artifacts import router as artifacts_router
from nusa.api.routes_settings import router as settings_router
from nusa.api.websocket import router as websocket_router

__all__ = [
    "projects_router",
    "tasks_router",
    "approvals_router",
    "artifacts_router",
    "settings_router",
    "websocket_router",
]
