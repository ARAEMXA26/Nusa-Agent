"""WebSocket handler for real-time event streaming and client actions."""

import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from nusa.core.events import event_bus, GatewayEvent
from nusa.core.orchestrator import orchestrator
from nusa.db.connection import get_db

router = APIRouter(tags=["websocket"])
logger = logging.getLogger("nusa.websocket")


@router.websocket("/ws/events")
async def websocket_events_endpoint(websocket: WebSocket):
    await websocket.accept()

    # Event forwarder
    async def forward_event(event: GatewayEvent):
        try:
            await websocket.send_json(event.model_dump())
        except Exception:
            pass

    event_bus.subscribe(forward_event)

    try:
        while True:
            raw_msg = await websocket.receive_text()
            try:
                data = json.loads(raw_msg)
            except Exception:
                continue

            action = data.get("action")

            if action == "ping":
                await websocket.send_json({"event": "pong"})

            elif action == "task.steer":
                task_id = data.get("task_id")
                message = data.get("message")
                if task_id and message:
                    await orchestrator.steer_task(task_id, message)

            elif action == "task.cancel":
                task_id = data.get("task_id")
                reason = data.get("reason", "Cancelled by client")
                if task_id:
                    await orchestrator.cancel_task(task_id, reason)

            elif action == "approval.respond":
                approval_id = data.get("approval_id")
                decision = data.get("decision", "rejected")
                if approval_id:
                    orchestrator.resolve_approval(approval_id, decision)

    except WebSocketDisconnect:
        pass
    finally:
        event_bus.unsubscribe(forward_event)
