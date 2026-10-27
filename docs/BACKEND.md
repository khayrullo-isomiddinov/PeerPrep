# Backend

FastAPI app in `back/`. Entry point: `app/main.py`. All routes are mounted under `API_PREFIX` (`/api`).

## Modules

| Path | Responsibility |
|---|---|
| `app/main.py` | Logging setup, lifespan (migrate + seed), FastAPI app (docs off in production), CORS, GZip, hardening, routers |
| `app/core/config.py` | `Settings` (pydantic-settings, reads `.env`). `SECRET_KEY` falls back to a generated, git-ignored `back/.secret_key` |
| `app/core/db.py` | Engine (SQLite: NullPool; Postgres: pool 5 + overflow 5, pre-ping, recycle 300 s), `get_session` dependency |
| `app/core/migrations.py` | Runs `alembic upgrade head` on startup; stamps legacy `create_all` databases at `0001` |
| `app/core/security.py` | Argon2 password hashing (passlib), HS256 JWT create/decode (python-jose) |
| `app/core/http.py` | Security-header middleware, 413 for bodies > 60 MB, global 500 handler (logs the traceback, returns a generic message) |
| `app/core/rate_limit.py` | In-memory sliding-window limiter: `hit`, `check`, `reset`, `limit_by_ip(name, n, window)` dependency, `client_ip` |
| `app/core/ws_auth.py` | `accept_authenticated(ws, session)`: reads the token from the subprotocol, accepts, returns the `User` or closes with 1008 |
| `app/api/version_one/auth.py` | Register, verify, login, me, profile update, public profile, delete account. Exposes `_get_user_from_token` / `_get_optional_user_from_token` dependencies |
| `app/api/version_one/events.py` | Event CRUD, listing/filters, join/leave, attendees, AI helpers |
| `app/api/version_one/event_chat.py` | Chat HTTP endpoints + chat WebSocket |
| `app/api/version_one/whiteboard.py` | Whiteboard WebSocket (no HTTP endpoints) |
| `app/api/version_one/badges.py` | Badge/XP stats |
| `app/api/version_one/health.py` | Liveness + readiness |
| `app/services/event_queries.py` | Status logic (`upcoming/ongoing/past/all`), member counts, `serialize_event(s)` (gates study materials to members), `without_materials` (defers the big column in list queries), `is_member`, "my events" query |
| `app/services/users.py` | `display_name(user)`, `public_user(user)`: the **only** way to expose another user |
| `app/services/chat_state.py` | In-memory chat sockets, presence (5 min timeout), typing (3 s), `broadcast_to_event` |
| `app/services/cleanup.py` | `delete_event_data`, `delete_user_data` (no DB-level cascades, so delete children explicitly) |
| `app/services/gamification.py` | Weekly streak, engagement score, XP calculator, `BadgeSystem.BADGES`, awarding |
| `app/services/ai.py` | OpenAI client: `refine_text` (gpt-4o), `generate_image` (dall-e-3 → base64 data URL) |
| `app/services/email.py` | Blocking SMTP send (called in a thread, 10 s timeout) |
| `app/schemas/validators.py` | `image_url`, `optional_text`, `check_study_materials` validators |
| `app/seed.py` | Creates the admin (random password if `ADMIN_PASSWORD` < 12 chars) and 8 sample events when the DB has none |

## Data model (`app/models/`)

| Table | Columns (key ones) | Notes |
|---|---|---|
| `user` | id, email (unique), hashed_password, is_verified, verification_token, created_at, name?, bio?, photo_url?, xp | Email is matched case-insensitively and normalized to lowercase on input |
| `event` | id, title, starts_at, location, capacity (1–1000), duration (h, 1–24), description?, exam?, cover_image_url?, study_materials? (JSON string), created_by, created_at | Status fields are computed, not stored |
| `eventattendee` | id, event_id, user_id, joined_at, xp_awarded | Creator gets a row on create |
| `eventmessage` | id, event_id, user_id, content, created_at, is_deleted | Soft delete |
| `messageread` | id, message_id, message_type ("event"), user_id, read_at | Read receipts |
| `whiteboardelement` | id, event_id, element_id (≤64, client id), data (JSON), created_by, updated_at | ≤ 5000 per board |

Migrations: `alembic/versions/0001_baseline_schema.py`, `0002_performance_indexes.py`. To add one:
`cd back && alembic revision -m "describe change"`, write `upgrade`/`downgrade` by hand (use `if_not_exists` where
reasonable), then test against SQLite and Postgres.

## Authentication & authorization

- `Authorization: Bearer <jwt>` on HTTP; subprotocols `["peerprep.bearer", <jwt>]` on WebSockets.
- `_get_user_from_token` → 401 if missing, invalid or expired, or the user doesn't exist.
  `_get_optional_user_from_token` → `None` instead of 401.
- Ownership: `_get_own_event` → 403 unless `event.created_by == user.id` (edit, delete).
- Membership (`is_member`: attendee or creator) is required for chat history, posting, typing, the chat socket and
  the whiteboard socket.
- Admin (`ADMIN_EMAIL`) can't delete their account. No other admin powers exist.

## Rate limits (`app/core/rate_limit.py`)

| Key | Limit | Where |
|---|---|---|
| `login:ip:<ip>` | 10 / 60 s | `POST /auth/login` |
| `login:fail:<email>` | 10 failures / 15 min; checked **before** password verification, cleared on success | `POST /auth/login` |
| `register:ip:<ip>` | 5 / 10 min | `POST /auth/register` |
| `resend:ip:<ip>` + `resend:email:<email>` | 5 / 10 min, 3 / 10 min | `POST /auth/resend-verification` |
| `ai:user:<id>` | 20 / hour | refine-text, generate-image |
| `chat:user:<id>` | 20 / 10 s | chat HTTP post + socket `message` |

Over the limit → `429` with `Retry-After` (on the socket: an `error` message, and the message is dropped).
IP = `CF-Connecting-IP` / `True-Client-IP` / last `X-Forwarded-For` entry / socket peer.

## HTTP API reference

Prefix: `/api`. JSON bodies. Errors: `{"detail": "human readable"}` (422 validation errors use FastAPI's list format;
the frontend's `getErrorMessage` handles both). 🔒 = Bearer token required; 🔓 = optional token (enriches the
response).

### Health
| Method & path | Auth | Response |
|---|---|---|
| `GET /health` | – | `{"status":"ok"}`, liveness; doesn't touch the DB |
| `GET /health/ready` | – | `{"status":"ok","database":"up"}` or **503** `{"status":"unavailable","database":"down"}` |

### Auth (`/auth`)
| Method & path | Auth | Body / query | Response |
|---|---|---|---|
| `POST /auth/register` | – | `{email, password}` (8–128 chars) | `{message, email_sent, verify_url?}`. 400 if a verified account exists. Re-registering an unverified email re-sends the link and keeps the original password |
| `POST /auth/resend-verification` | – | `{email}` | `{message, email_sent, verify_url?}` or `{message, already_verified:true}`; 404 if unknown |
| `GET /auth/verify?token=` | – | | 303 redirect to `FRONTEND_BASE_URL/login?verified=1|0` |
| `POST /auth/login` | – | `{email, password}` | `{access_token, token_type:"bearer", user: User}`; 401 wrong credentials, 403 unverified, 429 limited |
| `GET /auth/me` | 🔒 | | `User` (includes email), `Cache-Control: no-store` |
| `PUT /auth/profile` | 🔒 | `{name?, bio?, photo_url?}` (name ≤100, bio ≤1000, photo = image data URL / https, `""` clears) | `User` |
| `GET /auth/user/{id}` | – | | `PublicProfile` = `{id, name, photo_url, is_verified, bio, created_at, xp}` (**no email**) |
| `DELETE /auth/account` | 🔒 | | `{message}`. Deletes the user's events (+ their data), memberships, messages, read receipts and whiteboard elements. 403 for admin |

`User` = `{id, email, name, bio, photo_url, is_verified, created_at, xp}`.

### Events (`/events`)
| Method & path | Auth | Body / query | Response |
|---|---|---|---|
| `GET /events` | 🔓 | `q, location, exam` (ILIKE), `status=upcoming|ongoing|past|all` (default upcoming), `sort=newest|soonest` (default newest), `limit` 1–100 (50), `offset` | `Event[]`. `newest`: `created_at desc`; `soonest`: `starts_at asc`; past is always `starts_at desc` |
| `POST /events` | 🔒 | `EventCreate` | 201 `Event`; creator auto-joins |
| `GET /events/my-events` | 🔒 | `status, limit, offset` | `Event[]` created or attended |
| `GET /events/my-events/count` | 🔒 | `status` | `{count}` |
| `GET /events/autocomplete?q=` | – | q 1–200 chars, `limit` ≤20 | `[{id, title, location, full}]` |
| `GET /events/{id}` | 🔓 | | `Event` with `materials_count`; `study_materials` only for members (else `null`); side effect: awards XP to a member if the event has ended |
| `PATCH /events/{id}` | 🔒 owner | partial `EventUpdate` | `Event`; 422 if moved into the past or required fields nulled; 400 if capacity < members |
| `DELETE /events/{id}` | 🔒 owner | | 204; deletes attendees, messages, reads, whiteboard |
| `POST /events/{id}/join` | 🔒 | | `{success, attendee_count, alreadyJoined?}`; 400 started, 409 full |
| `DELETE /events/{id}/join` | 🔒 | | `{success, attendee_count, notJoined?}`; 400 started |
| `GET /events/{id}/attendees` | – | | `number[]` user ids (creator included) |
| `GET /events/{id}/attendees/details` | – | | `Member[]` = `public_user + joined_at`, ordered by join time |
| `POST /events/refine-text` | 🔒 | `{text ≤5000, field_type: title|description|general}` | `{refined_text}`; 503 if no OpenAI key, 502 provider failure |
| `POST /events/generate-image` | 🔒 | `{prompt ≤1000}` | `{image_url}` (base64 PNG data URL) |

`EventCreate`: `title` (1–200, required), `starts_at` (ISO; must be in the future; zone-less = UTC), `location` (1–300),
`capacity` 1–1000 (10), `duration` 1–24 h (2), `description` ≤5000, `exam` ≤100, `cover_image_url` (image data URL ≤5 MB
or https), `study_materials` (JSON string: ≤10 items `{name ≤255, type, size:int, data: data-URL ≤10 MB}`, total
≤ ~30 MB).

`Event` (response) = all fields above + `id, created_by, created_at, ends_at, is_past, is_ongoing, is_upcoming,
status` + `attendee_count, is_joined` (when the request has a valid token) + `materials_count` (single-event responses
only). **`study_materials` is `null` in every list** (`/events`, `/events/my-events`) and for non-members; only
single-event responses to members carry the files.

### Chat (`/events/{id}`)
| Method & path | Auth | Notes |
|---|---|---|
| `GET /messages?limit=1..500&offset=` | 🔒 member | Oldest first. Each: `{id, content (null if deleted), is_deleted, created_at, read_count, is_read_by_me, user: PublicUser}` |
| `POST /messages?content=` | 🔒 member | Fallback when the socket is down; 400 after the event ends; also broadcast to sockets |
| `DELETE /messages/{mid}` | 🔒 author | Soft delete, broadcasts `message_deleted` |
| `POST /messages/{mid}/read` | 🔒 | Records a read receipt |
| `POST /typing`, `GET /typing` | 🔒 member | HTTP fallback for typing indicators |
| `GET /presence` | 🔒 | `{presence: [{id, name, photo_url, is_online, last_seen}]}` |
| `WS /ws` | subprotocol | See [REALTIME.md](REALTIME.md) |

`PublicUser` = `{id, name, photo_url, is_verified}`; `name` = chosen name or the email local part.

### Whiteboard
`WS /events/{id}/whiteboard/ws` only. See [REALTIME.md](REALTIME.md).

### Badges (`/badges`)
| Method & path | Auth | Response |
|---|---|---|
| `GET /badges/user/{id}` | – | `{user_id, badge: {name, ...}, total_xp, total_accepted_submissions (always 0, legacy), events_attended (ended events attended or created), engagement_score 0–1, weekly_streak}` |
| `GET /badges/me` | 🔒 | same for the caller |
| `POST /badges/me/award-past-events` | 🔒 | Awards XP for every ended event not yet awarded; returns a summary |

## Error handling and logging

- Unhandled exceptions → logged with traceback (`peerprep` logger) → `500 {"detail":"Something went wrong on our side..."}`.
- AI and email failures log the error type only; responses never echo provider messages.
- Log format: `%(asctime)s %(levelname)s %(name)s: %(message)s` at INFO. Never log emails, tokens or message text.

## Tests (`back/tests/`)

`conftest.py` provides an in-memory SQLite engine per test, a `TestClient` with an overridden `get_session` and a
shared event loop (so two test sockets can talk), `test_user`, `test_user_unverified`, `auth_headers`, `test_event`,
an autouse rate-limit reset, an autouse fake email sender, and `ws_auth(token)` for socket subprotocols.

| File | Covers |
|---|---|
| `test_auth.py` | register, login, verify, me, profile, public profile |
| `test_account_and_event_rules.py` | verification fallback, deletion, event rules |
| `test_events.py` | CRUD, permissions, join/leave |
| `test_event_listing.py` | status filters, attendees, chat socket protocol, read-only chat |
| `test_whiteboard.py` | whiteboard socket auth, init, upsert/delete/clear, read-only |
| `test_security.py` | hashing, tokens, auth header handling |
| `test_hardening.py` | headers, lockout, rate limits, 413, upload validation, URL-token rejection, no emails in chat |
| `test_health.py` | health/readiness, removed AI health endpoint |
| `test_materials_visibility.py` | study materials members-only (detail, lists, anonymous), `materials_count`, `sort=soonest` |

Run: `cd back && python -m pytest -q`.
