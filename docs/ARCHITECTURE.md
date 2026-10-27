# Architecture

## System overview

```
                 ┌──────────────────────────── Vercel ────────────────────────────┐
 Browser ──────► │ Static SPA (Vite build): index.html, /assets/*, theme-init.js │
   │             │ vercel.json: SPA rewrite to index.html + security headers/CSP │
   │             └───────────────────────────────────────────────────────────────┘
   │  HTTPS (axios, Bearer JWT)      WSS (subprotocol "peerprep.bearer", <jwt>)
   ▼
 ┌─────────────────────────── Render (Frankfurt) ───────────────────────────┐
 │ uvicorn → FastAPI app (back/app/main.py)                                  │
 │   middleware: CORS → GZip → security headers / body-size limit           │
 │   routers under /api: health, auth, badges, events, event_chat, whiteboard│
 │   in-memory state: chat sockets, presence, typing, whiteboard sockets,    │
 │                    rate-limit counters  (single process!)                 │
 └───────────────┬─────────────────────────────────────┬────────────────────┘
                 │ SQLAlchemy (pool 5+5, pre-ping)      │ HTTPS (only on demand)
                 ▼                                      ▼
       Neon PostgreSQL (Frankfurt)              OpenAI API (gpt-4o, dall-e-3)
                                                SMTP server (verification mail)
```

- The frontend is a pure client-side SPA. `VITE_API_BASE_URL` is baked in at build time and points at the Render API.
- The backend is **one process**. Real-time fan-out, presence, typing indicators and rate limits all live in Python
  dicts. Running more than one instance would need Redis (or similar) for pub/sub and counters.
- On startup, the app runs Alembic migrations (`app/core/migrations.py`) and then seeds an admin user plus sample
  events if the database has none (`app/seed.py`).

## Domain model

```
User 1───* Event            (Event.created_by → User.id; the creator is also inserted as an attendee)
User *───* Event            via EventAttendee (joined_at, xp_awarded)
Event 1───* EventMessage    (soft delete: is_deleted + content "")
EventMessage 1───* MessageRead (read receipts; message_type always "event")
Event 1───* WhiteboardElement (element_id is the client id; data is the JSON element)
```

The event lifecycle is derived from time, never stored:
`upcoming` (now < starts_at) → `ongoing` (starts_at ≤ now < starts_at + duration h) → `past`.
- You can join, leave or edit an event only before it starts.
- Chat and whiteboard become read-only once it has ended.
- XP is awarded after it ends.

## Main flows

### Sign-up and sign-in
1. `POST /auth/register` creates an unverified user with a random `verification_token` and emails
   `GET /api/auth/verify?token=…`. If the email can't be sent and `VERIFY_LINK_FALLBACK=true`, the response contains
   `verify_url` and the frontend shows it.
2. The verify link marks the user verified and redirects to `FRONTEND_BASE_URL/login?verified=1|0`.
3. `POST /auth/login` returns `{access_token, token_type, user}`. The JWT is HS256, `sub` is the user id, and it
   expires after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 60). There are no refresh tokens.
4. The frontend stores the token in `localStorage.access_token`, and an axios interceptor attaches it to every
   request. A 401 on a signed-in request fires the `auth:session-expired` window event; `AuthContext` then signs the
   user out and shows a notice on the login page.

### Reading and changing data (frontend)
`page → hook (src/hooks/*) → React Query → utils/api.ts (axios) → /api/...`
- Lists and details are cached per key (`eventKeys.list(params)`, `eventKeys.detail(id)`, ...).
- Join and leave update every cached copy of the event optimistically (`setQueriesData`); create, update and delete
  invalidate `eventKeys.all`.
- Hovering an event card prefetches its detail page.

### Real-time
Each event has two independent WebSockets, chat and whiteboard; see [REALTIME.md](REALTIME.md).
- Chat messages are also stored in the database and loaded over HTTP. While the chat socket is down, the hook
  polls every 30 s and posts messages over HTTP instead.
- Whiteboard state is the set of `WhiteboardElement` rows, sent in full in the `init` message, then changed with
  `upsert`, `delete` and `clear`.

### Gamification
- When an attendee opens an ended event, the server awards XP: `GET /events/{id}` calls `award_xp_for_event`.
  The profile page also calls `POST /badges/me/award-past-events` to catch up.
- XP per event = `30 × (1 + 0.15·engagement) × (1 + 0.05·weekly_streak)`, at least 30. Each attendance pays out once,
  guarded by `EventAttendee.xp_awarded`.
- Badge level (Beginner → Master) needs XP **and** past events, weekly streak and engagement thresholds
  (`BadgeSystem.BADGES`).
- `engagement = 0.4·recency + 0.3·frequency + 0.3·consistency`, each part capped at 1.

## Key decisions (and why)

| Decision | Why |
|---|---|
| Files (covers, study materials, avatars) stored as base64 data URLs in DB columns | No object storage needed on free tiers. Cost: big rows and big JSON bodies, so validators cap sizes and the server refuses bodies over 60 MB. |
| Single uvicorn process with in-memory real-time state | Simple and enough for the scale; Render free tier. |
| JWT in localStorage (not cookies) | Simple cross-origin setup (Vercel ↔ Render); no CSRF surface. A strict CSP limits XSS risk. |
| WebSocket token via `Sec-WebSocket-Protocol` | Browsers can't set headers on WebSockets, and query strings end up in access logs. |
| React Query as the only server-state cache | One source of truth; no hand-synced copies in context or component state. |
| Self-hosted fonts (@fontsource), no third-party scripts | GDPR (no IP leakage to Google), lets the CSP be strict. |
| Alembic migrations run on startup | Every deploy brings the schema up to date with no manual step. Legacy databases made by `create_all` are stamped at `0001`. |
| Typographic event covers when no image exists | Distinctive "study notebook" identity; no stock photos. |
