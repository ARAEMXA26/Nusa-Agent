"""Main FastAPI application for Nusa Agent Gateway."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from nusa.config import config
from nusa.db.connection import init_db
from nusa.api import (
    projects_router,
    tasks_router,
    approvals_router,
    artifacts_router,
    settings_router,
    skills_router,
    mcp_router,
    websocket_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure directories and database exist
    config.init_directories()
    init_db(config.db_path)
    yield
    # Shutdown


app = FastAPI(
    title="Nusa Agent Gateway",
    version=config.version,
    description="Local Agent Gateway & Control Plane",
    lifespan=lifespan,
)

# Enable CORS for Desktop Shell & Web UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(projects_router)
app.include_router(tasks_router)
app.include_router(approvals_router)
app.include_router(artifacts_router)
app.include_router(settings_router)
app.include_router(skills_router)
app.include_router(mcp_router)
app.include_router(websocket_router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": config.app_name,
        "version": config.version,
    }


def start():
    """CLI entrypoint to run the gateway server."""
    import uvicorn

    uvicorn.run(
        "nusa.main:app",
        host=config.host,
        port=config.port,
        reload=False,
    )


if __name__ == "__main__":
    start()
