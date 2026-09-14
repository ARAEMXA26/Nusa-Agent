"""Settings API routes."""

import json
from fastapi import APIRouter
from pydantic import BaseModel
from nusa.db.connection import get_db
from nusa.security.redaction import redact_secrets

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    openai_api_key: str | None = None
    openai_base_url: str | None = None
    anthropic_api_key: str | None = None
    ollama_base_url: str | None = None
    default_model: str | None = None


@router.get("")
def get_settings():
    with get_db() as db:
        rows = db.execute("SELECT key, value_json FROM settings").fetchall()
        settings = {}
        for r in rows:
            val = json.loads(r["value_json"])
            # Redact sensitive keys
            if "api_key" in r["key"] and isinstance(val, str) and len(val) > 8:
                val = val[:4] + "..." + val[-4:]
            settings[r["key"]] = val

        return {
            "settings": settings,
            "available_providers": ["openai", "anthropic", "gemini", "ollama", "openrouter", "deterministic"],
        }


@router.post("")
def update_settings(req: SettingsUpdate):
    updates = req.model_dump(exclude_unset=True, exclude_none=True)
    with get_db() as db:
        for k, v in updates.items():
            db.execute(
                """
                INSERT INTO settings (key, value_json) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP
                """,
                (k, json.dumps(v)),
            )
    return {"status": "ok"}
