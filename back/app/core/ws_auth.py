"""Sign-in for WebSockets.

Browsers can't set headers on a WebSocket, and a token in the URL ends up in access logs, so the client
offers two subprotocols: a marker and the token itself. The server answers with the marker only.
"""
from typing import Optional

from fastapi import WebSocket
from sqlmodel import Session

from app.core.security import decode_token
from app.models import User

TOKEN_PROTOCOL = "peerprep.bearer"


async def accept_authenticated(websocket: WebSocket, session: Session) -> Optional[User]:
    """Accept the socket and return its user, or close it and return None."""
    offered = [p.strip() for p in websocket.headers.get("sec-websocket-protocol", "").split(",") if p.strip()]
    token = None
    if TOKEN_PROTOCOL in offered:
        index = offered.index(TOKEN_PROTOCOL)
        token = offered[index + 1] if index + 1 < len(offered) else None

    await websocket.accept(subprotocol=TOKEN_PROTOCOL if token else None)
    user = None
    if token:
        try:
            user = session.get(User, int(decode_token(token).get("sub")))
        except Exception:
            user = None
    if not user:
        await websocket.close(code=1008, reason="Authentication required")
    return user
