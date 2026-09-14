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
    workforce_router,
    browser_router,
    memory_router,
    profiles_router,
    cron_router,
    plugins_router,
    websocket_router,
)
from nusa.browser.manager import browser_manager
from nusa.scheduler.manager import cron_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure directories, database exist, and start background cron scheduler
    config.init_directories()
    init_db(config.db_path)
    cron_manager.start()
    yield
    # Shutdown: clean up cron scheduler and browser resources
    cron_manager.stop()
    await browser_manager.close()


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
app.include_router(workforce_router)
app.include_router(browser_router)
app.include_router(memory_router)
app.include_router(profiles_router)
app.include_router(cron_router)
app.include_router(plugins_router)
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
