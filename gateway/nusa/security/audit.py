"""Append-only audit logging."""

import json
import uuid
from typing import Any
from nusa.db.connection import get_db


def log_audit_event(
    actor: str,
    event_type: str,
    project_id: str | None = None,
    task_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> str:
    event_id = str(uuid.uuid4())
    details_json = json.dumps(details or {})
    with get_db() as db:
        db.execute(
            """
            INSERT INTO audit_events (id, actor, event_type, project_id, task_id, details_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (event_id, actor, event_type, project_id, task_id, details_json),
        )
    return event_id
