"""In-memory state for event chat: open WebSocket connections, presence and typing indicators.

This lives in the process, so it assumes a single backend instance (true on the free Render tier).
Scaling to several instances would need a shared store such as Redis.
"""
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, Optional

from fastapi import WebSocket

PRESENCE_TIMEOUT_SECONDS = 300
TYPING_TIMEOUT_SECONDS = 3

# event_id -> user_id -> socket (one chat connection per user per event)
event_connections: Dict[int, Dict[int, WebSocket]] = {}
# user_id -> last activity
user_presence: Dict[int, datetime] = {}
# event_id -> user_id -> last keystroke
typing_status: Dict[int, Dict[int, datetime]] = defaultdict(dict)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def touch_presence(user_id: int) -> None:
    user_presence[user_id] = _now()


def is_online(user_id: int) -> bool:
    last = user_presence.get(user_id)
    return last is not None and (_now() - last).total_seconds() <= PRESENCE_TIMEOUT_SECONDS


def expire_presence() -> None:
    for user_id in [uid for uid in user_presence if not is_online(uid)]:
        del user_presence[user_id]


def mark_typing(event_id: int, user_id: int) -> None:
    typing_status[event_id][user_id] = _now()
    touch_presence(user_id)


def typing_user_ids(event_id: int, exclude_user_id: Optional[int] = None) -> list[int]:
    now = _now()
    active = typing_status.get(event_id, {})
    for user_id in [uid for uid, at in active.items() if (now - at).total_seconds() > TYPING_TIMEOUT_SECONDS]:
        del active[user_id]
    return [uid for uid in active if uid != exclude_user_id]


def online_connected_users(event_id: int, exclude_user_id: int) -> list[int]:
    return [uid for uid in event_connections.get(event_id, {}) if uid != exclude_user_id and is_online(uid)]


async def broadcast_to_event(event_id: int, exclude_user_id: Optional[int], message: dict) -> None:
    """Send to everyone connected to the event's chat (optionally except one user); drop dead sockets."""
    connections = event_connections.get(event_id, {})
    dead = []
    for user_id, ws in list(connections.items()):
        if user_id == exclude_user_id:
            continue
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(user_id)
    for user_id in dead:
        connections.pop(user_id, None)
