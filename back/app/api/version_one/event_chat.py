"""Event chat: message history and posting over HTTP, plus the real-time WebSocket
(messages, typing indicators, read receipts and presence)."""
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select

from app.api.version_one.auth import _get_user_from_token
from app.core.db import get_session
from app.core.security import decode_token
from app.models import Event, EventAttendee, EventMessage, MessageRead, User
from app.services import chat_state
from app.services.event_queries import as_utc, has_ended, is_member

router = APIRouter(prefix="/events/{event_id}", tags=["chat"])

MAX_MESSAGE_LENGTH = 1000
INITIAL_HISTORY = 50
READ_ONLY_MESSAGE = "This event has ended. Chat is now read-only. You can still view message history."


def _iso(dt: datetime) -> str:
    return as_utc(dt).isoformat()


def _author(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "photo_url": user.photo_url,
        "is_verified": user.is_verified,
    }


def _get_event(session: Session, event_id: int) -> Event:
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    return evt


def _require_member(session: Session, evt: Event, user: User, detail: str) -> None:
    if not is_member(session, evt, user):
        raise HTTPException(status_code=403, detail=detail)


def _serialize_messages(session: Session, messages: list[EventMessage], viewer_id: int, deleted_content) -> list[dict]:
    """Messages with their authors and read state, loaded in batches rather than per message."""
    if not messages:
        return []
    ids = [m.id for m in messages]
    authors = {u.id: u for u in session.exec(select(User).where(User.id.in_({m.user_id for m in messages}))).all()}
    readers: dict[int, set[int]] = {}
    for message_id, user_id in session.exec(
        select(MessageRead.message_id, MessageRead.user_id)
        .where(MessageRead.message_id.in_(ids), MessageRead.message_type == "event")
    ).all():
        readers.setdefault(message_id, set()).add(user_id)

    result = []
    for m in messages:
        author = authors.get(m.user_id)
        if not author:
            continue
        read_by = readers.get(m.id, set())
        result.append({
            "id": m.id,
            "content": deleted_content if m.is_deleted else m.content,
            "is_deleted": m.is_deleted,
            "created_at": _iso(m.created_at),
            "read_count": len(read_by),
            "is_read_by_me": viewer_id in read_by,
            "user": _author(author),
        })
    return result


def _new_message_payload(message: EventMessage, author: User) -> dict:
    return {
        "type": "new_message",
        "message": {
            "id": message.id,
            "content": message.content,
            "is_deleted": False,
            "created_at": _iso(message.created_at),
            "is_read_by_me": False,
            "user": _author(author),
        },
    }


def _mark_read(session: Session, event_id: int, message_id: int, user_id: int) -> bool:
    """Record a read receipt. Returns True if it was new."""
    message = session.get(EventMessage, message_id)
    if not message or message.event_id != event_id:
        return False
    exists = session.exec(select(MessageRead).where(
        MessageRead.message_id == message_id,
        MessageRead.message_type == "event",
        MessageRead.user_id == user_id,
    )).first()
    if exists:
        return False
    session.add(MessageRead(message_id=message_id, message_type="event", user_id=user_id))
    session.commit()
    return True


# ---------- HTTP ----------

@router.get("/messages")
def get_event_messages(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Message history, oldest first (the newest `limit` messages, skipping `offset`)."""
    evt = _get_event(session, event_id)
    _require_member(session, evt, current_user, "Join this event to see its chat")
    messages = session.exec(
        select(EventMessage).where(EventMessage.event_id == event_id)
        .order_by(EventMessage.created_at.desc()).limit(limit).offset(offset)
    ).all()
    return _serialize_messages(session, list(reversed(messages)), current_user.id, deleted_content=None)


@router.post("/messages")
async def post_event_message(
    event_id: int,
    content: str = Query(..., min_length=1, max_length=MAX_MESSAGE_LENGTH),
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
):
    """Fallback for posting when the WebSocket isn't connected; also pushed live to connected members."""
    evt = _get_event(session, event_id)
    _require_member(session, evt, current_user, "You must be an attendee or event organizer to post messages")
    if not content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if has_ended(evt):
        raise HTTPException(status_code=400, detail="This event has ended. The chat is now read-only.")

    chat_state.touch_presence(current_user.id)
    message = EventMessage(event_id=event_id, user_id=current_user.id, content=content.strip())
    session.add(message)
    session.commit()
    session.refresh(message)

    payload = _new_message_payload(message, current_user)
    await chat_state.broadcast_to_event(event_id, None, payload)
    return {key: payload["message"][key] for key in ("id", "content", "created_at", "user")}


@router.delete("/messages/{message_id}")
async def delete_event_message(
    event_id: int,
    message_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
):
    """Soft-delete your own message and tell everyone in the chat."""
    _get_event(session, event_id)
    message = session.get(EventMessage, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.event_id != event_id:
        raise HTTPException(status_code=400, detail="Message does not belong to this event")
    if message.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")

    message.is_deleted = True
    message.content = ""
    session.add(message)
    session.commit()

    await chat_state.broadcast_to_event(event_id, None, {"type": "message_deleted", "message_id": message_id})
    return {"message": "Message deleted successfully"}


@router.post("/messages/{message_id}/read")
def mark_event_message_read(
    event_id: int,
    message_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
):
    _get_event(session, event_id)
    message = session.get(EventMessage, message_id)
    if not message or message.event_id != event_id:
        raise HTTPException(status_code=404, detail="Message not found")
    _mark_read(session, event_id, message_id, current_user.id)
    return {"status": "read"}


@router.post("/typing")
def set_typing_status(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
):
    evt = _get_event(session, event_id)
    _require_member(session, evt, current_user, "You must be an attendee or event organizer")
    chat_state.mark_typing(event_id, current_user.id)
    return {"status": "typing"}


@router.get("/typing")
def get_typing_status(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
):
    _get_event(session, event_id)
    user_ids = chat_state.typing_user_ids(event_id, exclude_user_id=current_user.id)
    if not user_ids:
        return {"typing_users": []}
    users = session.exec(select(User).where(User.id.in_(user_ids))).all()
    return {"typing_users": [{"id": u.id, "name": u.name or u.email, "photo_url": u.photo_url} for u in users]}


@router.get("/presence")
def get_event_presence(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
):
    """Online/offline status for every member of the event."""
    evt = _get_event(session, event_id)
    member_ids = set(session.exec(select(EventAttendee.user_id).where(EventAttendee.event_id == event_id)).all())
    member_ids.add(evt.created_by)
    if current_user.id in member_ids:
        chat_state.touch_presence(current_user.id)
    chat_state.expire_presence()

    users = session.exec(select(User).where(User.id.in_(member_ids))).all()
    presence = []
    for u in users:
        last_seen = chat_state.user_presence.get(u.id)
        presence.append({
            "id": u.id,
            "name": u.name or u.email,
            "photo_url": u.photo_url,
            "is_online": chat_state.is_online(u.id),
            "last_seen": last_seen.isoformat() if last_seen else None,
        })
    return {"presence": presence}


# ---------- WebSocket ----------

def _authenticate(token: Optional[str], session: Session) -> Optional[User]:
    if not token:
        return None
    try:
        return session.get(User, int(decode_token(token).get("sub")))
    except Exception:
        return None


@router.websocket("/ws")
async def event_chat_websocket(websocket: WebSocket, event_id: int, session: Session = Depends(get_session)):
    """Real-time chat for an event's members.

    Client -> server: message, typing, presence_ping, mark_read
    Server -> client: initial_messages, new_message, message_deleted, typing, presence_update,
                      message_read, user_joined, user_left, error
    """
    await websocket.accept()

    user = _authenticate(websocket.query_params.get("token"), session)
    if not user:
        await websocket.close(code=1008, reason="Authentication required")
        return
    evt = session.get(Event, event_id)
    if not evt:
        await websocket.close(code=1008, reason="Event not found")
        return
    if not is_member(session, evt, user):
        await websocket.close(code=1008, reason="Access denied")
        return

    display_name = user.name or user.email
    chat_state.event_connections.setdefault(event_id, {})[user.id] = websocket
    chat_state.touch_presence(user.id)

    recent = session.exec(
        select(EventMessage).where(EventMessage.event_id == event_id)
        .order_by(EventMessage.created_at.desc()).limit(INITIAL_HISTORY)
    ).all()
    await websocket.send_json({
        "type": "initial_messages",
        "messages": _serialize_messages(session, list(reversed(recent)), user.id, deleted_content=""),
    })
    await chat_state.broadcast_to_event(event_id, user.id, {
        "type": "user_joined", "user_id": user.id, "user_name": display_name, "user_photo_url": user.photo_url,
    })

    try:
        while True:
            try:
                data = json.loads(await websocket.receive_text())
            except (ValueError, TypeError):
                continue
            if not isinstance(data, dict):
                continue
            message_type = data.get("type")

            if message_type == "message":
                if has_ended(evt):
                    await websocket.send_json({"type": "error", "message": READ_ONLY_MESSAGE})
                    continue
                content = str(data.get("content") or "").strip()
                if not content or len(content) > MAX_MESSAGE_LENGTH:
                    continue
                message = EventMessage(event_id=event_id, user_id=user.id, content=content)
                session.add(message)
                session.commit()
                session.refresh(message)
                chat_state.touch_presence(user.id)
                await chat_state.broadcast_to_event(event_id, None, _new_message_payload(message, user))

            elif message_type == "typing":
                chat_state.mark_typing(event_id, user.id)
                await chat_state.broadcast_to_event(event_id, user.id, {
                    "type": "typing", "user_id": user.id, "user_name": display_name,
                })

            elif message_type == "presence_ping":
                chat_state.touch_presence(user.id)
                await websocket.send_json({
                    "type": "presence_update",
                    "online_users": chat_state.online_connected_users(event_id, exclude_user_id=user.id),
                })

            elif message_type == "mark_read":
                message_id = data.get("message_id")
                if isinstance(message_id, int) and _mark_read(session, event_id, message_id, user.id):
                    await chat_state.broadcast_to_event(event_id, user.id, {
                        "type": "message_read", "message_id": message_id, "user_id": user.id,
                    })
    except WebSocketDisconnect:
        pass
    except RuntimeError as e:
        if "disconnect" not in str(e).lower():
            print(f"Chat WebSocket error: {e}")
    finally:
        connections = chat_state.event_connections.get(event_id, {})
        # Only remove our own socket: the same user may have reconnected from another tab meanwhile
        if connections.get(user.id) is websocket:
            del connections[user.id]
        await chat_state.broadcast_to_event(event_id, user.id, {"type": "user_left", "user_id": user.id})
