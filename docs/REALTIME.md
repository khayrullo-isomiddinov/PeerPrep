# Real-time protocols

Two WebSockets per event, both members-only, both JSON text frames.

| Socket | URL | Server | Client |
|---|---|---|---|
| Chat | `wss://<api>/api/events/{id}/ws` | `back/app/api/version_one/event_chat.py` | `front/src/hooks/useEventChat.js` |
| Whiteboard | `wss://<api>/api/events/{id}/whiteboard/ws` | `back/app/api/version_one/whiteboard.py` | `front/src/features/whiteboard/useWhiteboardSocket.js` + `src/pages/Whiteboard.jsx` |

## Connecting and auth (both sockets)

```js
// front/src/utils/socket.ts
new WebSocket(socketUrl(path), ["peerprep.bearer", token])
```

- The server (`accept_authenticated` in `back/app/core/ws_auth.py`) reads `Sec-WebSocket-Protocol`, takes the value
  after `peerprep.bearer` as the JWT, and accepts with the subprotocol `peerprep.bearer`.
- Missing or invalid token, unknown event, or not a member → the server closes with **1008**. Clients treat 1008 as
  final and don't reconnect.
- A `?token=` query parameter is **not** accepted, on purpose: it would leak into access logs.
- Reconnect uses exponential backoff: chat up to 30 s, whiteboard up to 15 s.

## Chat socket

Membership = attendee or creator. Server state lives in `app/services/chat_state.py`: one socket per (event, user),
so a newer connection replaces the old one.

**Server → client**

| type | payload | when |
|---|---|---|
| `initial_messages` | `messages: Message[]` (last 50, oldest first) | right after connecting |
| `new_message` | `message: {id, content, is_deleted:false, created_at, is_read_by_me:false, user: PublicUser}` | anyone posts (socket or HTTP), including the sender |
| `message_deleted` | `message_id` | author deleted it (HTTP DELETE) |
| `typing` | `user_id, user_name` | someone else is typing |
| `presence_update` | `online_users: number[]` | reply to `presence_ping` |
| `message_read` | `message_id, user_id` | someone else read a message |
| `user_joined` | `user_id, user_name, user_photo_url` | another member connected |
| `user_left` | `user_id` | another member disconnected |
| `error` | `message` | event ended (read-only), or rate limited |

**Client → server**

| type | payload | effect |
|---|---|---|
| `message` | `content` (1–1000 chars after trim) | saved + broadcast to everyone; refused after the event ends; ≤20 per 10 s |
| `typing` | – | broadcast `typing` to others (the client throttles to one per 2 s) |
| `presence_ping` | – | refresh presence, get `presence_update` (the client sends one every 30 s) |
| `mark_read` | `message_id: int` | record a receipt; broadcast `message_read` if it's new |

Client behaviour (`useEventChat`):
- Messages and presence live in the React Query cache (`eventDataKeys`).
- While the socket is down, it polls every 30 s and sends messages via `POST /messages`.
- Messages typed while the socket is connecting are queued.
- Incoming messages are marked read after 500 ms.

## Whiteboard socket

Membership = attendee or creator. Several tabs per user are allowed (keyed by a connection id). Ended events are
read-only (`read_only: true`; mutations are answered with `error`).

**Server → client**

| type | payload |
|---|---|
| `init` | `elements: Element[]`, `users: {id,name,photo_url}[]` (others online), `you`, `is_owner`, `read_only` |
| `upsert` | `user_id, elements: Element[]` (persisted) |
| `delete` | `user_id, ids: string[]` |
| `clear` | `user_id` |
| `draft` | `user_id, element` (in progress, not persisted) |
| `draft_end` | `id` |
| `cursor` | `user_id, x, y` (world coordinates) |
| `cursor_leave` | `user_id` |
| `user_joined` | `user` (first connection of that user) |
| `user_left` | `user_id` (last connection of that user closed) |
| `error` | `message` (board full, read-only, not owner) |

**Client → server**: `upsert {elements}` (≤500 per batch), `delete {ids}`, `clear` (owner only), `draft {element}`,
`draft_end {id}`, `cursor {x, y}`, `cursor_leave`.

**Element** (validated in `_validate_element`: object, `id` string 1–64 chars, `type` in the set below, JSON ≤ 200 KB;
everything else is stored as-is and rendered by `front/src/features/whiteboard/elements.js`):

```jsonc
{ "id": "uuid", "type": "stroke", "points": [[x,y],...], "color": "#111827", "width": 4, "opacity"?: 0.35 }  // highlighter = width×3 + opacity
{ "id": "uuid", "type": "rect" | "ellipse", "x":0, "y":0, "w":100, "h":60, "color": "#...", "width": 4 }
{ "id": "uuid", "type": "line" | "arrow", "points": [[x1,y1],[x2,y2]], "color": "#...", "width": 4 }
{ "id": "uuid", "type": "text", "x":0, "y":0, "text": "...", "color": "#...", "fontSize": 24 }
{ "id": "uuid", "type": "note", "x":0, "y":0, "w":220, "h":170, "text": "...", "color": "#fef08a" }
```

Read the exact field names for the shapes in `elements.js` (`drawElement`, `getBounds`, `hitTest`) before changing
them; the server doesn't enforce them. A board holds at most 5000 elements; upserts past that are dropped and the
sender gets an `error`.
