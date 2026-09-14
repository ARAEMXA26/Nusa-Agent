"""Configuration management for Nusa Agent Gateway."""

import os
from pathlib import Path
from pydantic import BaseModel, Field

DEFAULT_DATA_DIR = Path.home() / ".nusa"
DEFAULT_DB_PATH = DEFAULT_DATA_DIR / "nusa.sqlite"


class GatewayConfig(BaseModel):
    app_name: str = "Nusa Agent"
    version: str = "0.1.0"
    host: str = "127.0.0.1"
    port: int = 4141
    data_dir: Path = Field(default_factory=lambda: Path(os.getenv("NUSA_DATA_DIR", str(DEFAULT_DATA_DIR))))
    db_path: Path = Field(default_factory=lambda: Path(os.getenv("NUSA_DB_PATH", str(DEFAULT_DB_PATH))))
    cors_origins: list[str] = ["*"]
    default_model: str = "openai/gpt-4o"
    max_tool_iterations: int = 25
    tool_timeout_seconds: int = 60

    def init_directories(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)


config = GatewayConfig()
