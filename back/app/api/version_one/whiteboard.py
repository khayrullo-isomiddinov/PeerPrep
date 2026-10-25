import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import func
from sqlmodel import Session, select, delete

from app.core.db import get_session
from app.core.ws_auth import accept_authenticated
from app.models import Event, EventAttendee, WhiteboardElement
from app.services.users import display_name

router = APIRouter(prefix="/events/{event_id}/whiteboard", tags=["whiteboard"])

ELEMENT_TYPES = {"stroke", "rect", "ellipse", "line", "arrow", "text", "note"}
MAX_ELEMENT_BYTES = 200_000
MAX_ELEMENTS_PER_BOARD = 5000
MAX_BATCH = 500

# event_id -> connection_id -> {"ws": WebSocket, "user": {...}}
# Keyed by connection rather than user so the same person can have the board open in several tabs.
board_connections: Dict[int, Dict[str, dict]] = {}


def _event_has_ended(evt: Event) -> bool:
    starts_at = evt.starts_at if evt.starts_at.tzinfo else evt.starts_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) >= starts_at + timedelta(hours=evt.duration)


def _validate_element(raw) -> Optional[dict]:
    if not isinstance(raw, dict):
        return None
    element_id = raw.get("id")
    if not isinstance(element_id, str) or not 0 < len(element_id) <= 64:
        return None
    if raw.get("type") not in ELEMENT_TYPES:
        return None
    if len(json.dumps(raw)) > MAX_ELEMENT_BYTES:
        return None
    return raw


def _online_users(event_id: int) -> list:
    unique = {}
    for conn in board_connections.get(event_id, {}).values():
        unique[conn["user"]["id"]] = conn["user"]
    return list(unique.values())


async def _broadcast(event_id: int, message: dict, exclude: Optional[str] = None):
    conns = board_connections.get(event_id, {})
    dead = []
    for connection_id, conn in list(conns.items()):
        if connection_id == exclude:
            continue
        try:
            await conn["ws"].send_json(message)
        except Exception:
            dead.append(connection_id)
    for connection_id in dead:
        conns.pop(connection_id, None)


def _upsert_elements(session: Session, event_id: int, user_id: int, elements: list) -> list:
    existing = {
        row.element_id: row
        for row in session.exec(
            select(WhiteboardElement).where(
                WhiteboardElement.event_id == event_id,
                WhiteboardElement.element_id.in_([el["id"] for el in elements]),
            )
        ).all()
    }
    count = session.exec(
        select(func.count()).select_from(WhiteboardElement).where(WhiteboardElement.event_id == event_id)
    ).one()

    saved = []
    now = datetime.now(timezone.utc)
    for el in elements:
        row = existing.get(el["id"])
        if row:
            row.data = json.dumps(el)
            row.updated_at = now
        else:
            if count >= MAX_ELEMENTS_PER_BOARD:
                break
            row = WhiteboardElement(event_id=event_id, element_id=el["id"], data=json.dumps(el), created_by=user_id)
            existing[el["id"]] = row
            count += 1
        session.add(row)
        saved.append(el)
    session.commit()
    return saved


@router.websocket("/ws")
async def whiteboard_websocket(websocket: WebSocket, event_id: int, session: Session = Depends(get_session)):
    """Real-time shared whiteboard for an event's members (attendees and organizer)."""
    user = await accept_authenticated(websocket, session)
    if not user:
        return

    evt = session.get(Event, event_id)
    if not evt:
        await websocket.close(code=1008, reason="Event not found")
        return

    is_owner = evt.created_by == user.id
    is_attendee = session.exec(
        select(EventAttendee).where(EventAttendee.event_id == event_id, EventAttendee.user_id == user.id)
    ).first() is not None
    if not is_owner and not is_attendee:
        await websocket.close(code=1008, reason="Access denied")
        return

    read_only = _event_has_ended(evt)
    me = {"id": user.id, "name": display_name(user), "photo_url": user.photo_url}
    connection_id = uuid4().hex

    rows = session.exec(
        select(WhiteboardElement).where(WhiteboardElement.event_id == event_id).order_by(WhiteboardElement.id)
    ).all()
    await websocket.send_json({
        "type": "init",
        "elements": [json.loads(row.data) for row in rows],
        "users": _online_users(event_id),
        "you": me,
        "is_owner": is_owner,
        "read_only": read_only,
    })

    already_online = any(c["user"]["id"] == user.id for c in board_connections.get(event_id, {}).values())
    board_connections.setdefault(event_id, {})[connection_id] = {"ws": websocket, "user": me}
    if not already_online:
        await _broadcast(event_id, {"type": "user_joined", "user": me}, exclude=connection_id)

    try:
        while True:
            try:
                data = json.loads(await websocket.receive_text())
            except (ValueError, TypeError):
                continue
            if not isinstance(data, dict):
                continue
            message_type = data.get("type")

            if message_type == "cursor":
                x, y = data.get("x"), data.get("y")
                if isinstance(x, (int, float)) and isinstance(y, (int, float)):
                    await _broadcast(event_id, {"type": "cursor", "user_id": user.id, "x": x, "y": y}, exclude=connection_id)
                continue

            if message_type == "cursor_leave":
                await _broadcast(event_id, {"type": "cursor_leave", "user_id": user.id}, exclude=connection_id)
                continue

            if read_only:
                await websocket.send_json({"type": "error", "message": "This event has ended. The whiteboard is read-only."})
                continue

            if message_type == "draft":
                # In-progress strokes/shapes/moves, shown live to others but not persisted
                element = _validate_element(data.get("element"))
                if element:
                    await _broadcast(event_id, {"type": "draft", "user_id": user.id, "element": element}, exclude=connection_id)

            elif message_type == "draft_end":
                element_id = data.get("id")
                if isinstance(element_id, str):
                    await _broadcast(event_id, {"type": "draft_end", "id": element_id}, exclude=connection_id)

            elif message_type == "upsert":
                raw = data.get("elements")
                if not isinstance(raw, list) or not raw:
                    continue
                elements = [el for el in (_validate_element(r) for r in raw[:MAX_BATCH]) if el]
                if not elements:
                    continue
                saved = _upsert_elements(session, event_id, user.id, elements)
                if len(saved) < len(elements):
                    await websocket.send_json({"type": "error", "message": "The whiteboard is full. Remove some items to keep drawing."})
                if saved:
                    await _broadcast(event_id, {"type": "upsert", "user_id": user.id, "elements": saved}, exclude=connection_id)

            elif message_type == "delete":
                ids = [i for i in (data.get("ids") or [])[:MAX_BATCH] if isinstance(i, str)]
                if not ids:
                    continue
                session.exec(delete(WhiteboardElement).where(
                    WhiteboardElement.event_id == event_id,
                    WhiteboardElement.element_id.in_(ids),
                ))
                session.commit()
                await _broadcast(event_id, {"type": "delete", "user_id": user.id, "ids": ids}, exclude=connection_id)

            elif message_type == "clear":
                if not is_owner:
                    await websocket.send_json({"type": "error", "message": "Only the organizer can clear the whiteboard."})
                    continue
                session.exec(delete(WhiteboardElement).where(WhiteboardElement.event_id == event_id))
                session.commit()
                await _broadcast(event_id, {"type": "clear", "user_id": user.id}, exclude=connection_id)

    except WebSocketDisconnect:
        pass
    except RuntimeError as e:
        if "disconnect" not in str(e).lower():
            logging.getLogger("peerprep.whiteboard").warning("Whiteboard WebSocket error: %s", e)
    finally:
        conns = board_connections.get(event_id, {})
        conns.pop(connection_id, None)
        if not conns:
            board_connections.pop(event_id, None)
        elif not any(c["user"]["id"] == user.id for c in conns.values()):
            await _broadcast(event_id, {"type": "user_left", "user_id": user.id})
