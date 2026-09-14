"""Event broadcasting and pub-sub bus."""

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Callable
from pydantic import BaseModel


class GatewayEvent(BaseModel):
    event: str
    task_id: str | None = None
    timestamp: str
    payload: dict[str, Any]


class EventBus:
    def __init__(self):
        self._subscribers: set[Callable[[GatewayEvent], Any]] = set()

    def subscribe(self, callback: Callable[[GatewayEvent], Any]) -> None:
        self._subscribers.add(callback)

    def unsubscribe(self, callback: Callable[[GatewayEvent], Any]) -> None:
        self._subscribers.discard(callback)

    async def emit(self, event_name: str, task_id: str | None = None, payload: dict[str, Any] | None = None) -> None:
        event = GatewayEvent(
            event=event_name,
            task_id=task_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            payload=payload or {},
        )
        for sub in list(self._subscribers):
            try:
                res = sub(event)
                if asyncio.iscoroutine(res):
                    await res
            except Exception:
                pass


event_bus = EventBus()
