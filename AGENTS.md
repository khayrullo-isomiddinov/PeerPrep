# PeerPrep — guide for AI agents

Read this first. It tells you what the system is, where things live, the commands to verify a change,
and the rules that aren't obvious from the code. Details are in [`docs/`](docs/).

## What PeerPrep is

A web app where students find study groups ("events"/"sessions"), join them, chat in real time and draw
together on a shared whiteboard. Users earn XP and levels for attending sessions. Free, no ads, no tracking.

- **Frontend**: React 19 + Vite 7 + Tailwind CSS v4 + TanStack React Query v5 + React Router 7. JavaScript with a
  gradual TypeScript layer (`allowJs`). Hosted on **Vercel**.
- **Backend**: Python 3.13, FastAPI + SQLModel (SQLAlchemy 2) + Alembic. JWT auth. WebSockets for chat and
  whiteboard. Hosted on **Render** (Frankfurt).
- **Database**: PostgreSQL on **Neon** (Frankfurt) in production; SQLite locally and in tests.
- **Optional**: OpenAI (text polishing + cover images), SMTP (verification emails).

Live: frontend https://peer-prep-gamma.vercel.app · API https://peerprep-api-eu.onrender.com/api

## Repository map

```
PeerPrep/
├── AGENTS.md              ← you are here
├── README.md              human quick-start
├── render.yaml            Render blueprint (backend service + env vars)
├── docs/
│   ├── ARCHITECTURE.md    system overview, request/data flow, key decisions
│   ├── BACKEND.md         modules, data model, full HTTP API reference, rules
│   ├── REALTIME.md        chat + whiteboard WebSocket protocols
│   ├── FRONTEND.md        structure, routing, data layer, design system, conventions
│   ├── SECURITY_PRIVACY.md what's public/private, auth, limits, validation, legal-page coupling
│   └── OPERATIONS.md      env vars, local dev, testing, deploy, troubleshooting
├── back/                  FastAPI app  (entry: app/main.py)
│   ├── app/api/version_one/   routers: auth, events, event_chat, whiteboard, badges, health
│   ├── app/core/              config, db, security (JWT/argon2), http hardening, rate_limit, ws_auth, migrations
│   ├── app/models/            SQLModel tables
│   ├── app/schemas/           request/response models + shared validators
│   ├── app/services/          business logic (queries, gamification, chat state, cleanup, users, ai, email)
│   ├── alembic/versions/      schema migrations (run automatically on startup)
│   └── tests/                 pytest suite
└── front/                 React app  (entry: src/main.jsx → src/App.jsx)
    ├── src/pages/             one component per route
    ├── src/features/<area>/   feature components (auth, events, home, profile, whiteboard, legal, onboarding)
    ├── src/components/        app shell (Navbar, Footer, MobileTabBar, ErrorBoundary) + ui/ kit
    ├── src/hooks/             React Query hooks + chat socket hook
    ├── src/utils/             api.ts (all HTTP calls), dates.ts, errors.ts, socket.ts, files.js
    ├── src/types/api.ts       TypeScript shapes of every API payload
    ├── src/index.css          design tokens + component utilities (Tailwind v4 @theme)
    └── vercel.json            SPA rewrite + security headers (CSP!)
```

## Verify every change

Run from the folder shown. All must pass before you call a change done.

| Where | Command | What |
|---|---|---|
| `back/` | `python -m pytest -q` | ~103 tests, in-memory SQLite, ~40 s |
| `front/` | `npm run lint` | ESLint (incl. react-hooks, react-refresh) |
| `front/` | `npm run typecheck` | `tsc --noEmit` |
| `front/` | `npm test` | Vitest unit tests |
| `front/` | `npm run build` | production build |

Run locally: `back/` → `uvicorn app.main:app --reload --port 8000`; `front/` → `npm run dev` (port 5173).
See [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Rules that are easy to break

1. **Emails are private.** Only `GET /api/auth/me` (and login/profile-update responses for yourself) may contain
   an email. Anything about *another* user goes through `public_user()` / `display_name()` in
   `back/app/services/users.py`. A test (`tests/test_hardening.py`) checks chat payloads.
2. **WebSocket auth uses a subprotocol, never the URL.** Client: `new WebSocket(url, ["peerprep.bearer", token])`
   via `openSocket()` in `front/src/utils/socket.ts`. Server: `accept_authenticated()` in `back/app/core/ws_auth.py`.
   Changing one side without the other breaks chat and whiteboard.
3. **Study materials are members-only.** They go out only through `serialize_event` (single event) to members; lists
   defer the column and always send `null`. Keep `tests/test_materials_visibility.py` passing.
4. **Anything rendered as `src`/`href` for other users must be validated** server-side
   (`back/app/schemas/validators.py`: images = `data:image/...;base64` or `https://`; study materials = `data:` URLs).
5. **Schema changes need an Alembic migration** in `back/alembic/versions/` (startup runs `upgrade head`). Never rely
   on `create_all` in production.
6. **React Query is the only client cache.** Server data lives in hooks under `src/hooks/`; don't copy it into
   component state or context. Mutations update/invalidate via the exported key factories (`eventKeys`, `profileKeys`,
   `eventDataKeys`).
7. **Style with design tokens, not raw colors.** Use `bg-surface`, `text-fg-muted`, `border-line`, etc. Both themes
   are just different token values. Use component props (`variant`, `tone`, `size`) instead of overriding a
   component's classes, because conflicting Tailwind classes silently lose. Wrap a component in a `div` to hide or
   show it responsively.
8. **Legal pages describe real behaviour.** If you change what's collected, stored, shown publicly, sent to a third
   party, or kept in browser storage, update `front/src/pages/Privacy.jsx` and bump `LEGAL.lastUpdated` in
   `front/src/features/legal/legalInfo.js`. Keep the processor list there in sync.
9. **CSP is strict** (`front/vercel.json`): no inline scripts, `connect-src` only allows the Render API host. A new
   third-party request, or a new API host, needs a CSP update.
10. **Badge levels exist twice**: `BadgeSystem.BADGES` in `back/app/services/gamification.py` and `BADGE_LEVELS` in
   `front/src/features/profile/badgeLevels.js`. Keep them in sync.
11. **Times are UTC.** The backend stores naive or UTC datetimes and serializes ISO strings; the frontend parses with
    `parseUTCDate()` in `src/utils/dates.ts`, which treats strings without a zone as UTC.
12. **Rate limits are in-memory and per process** (`back/app/core/rate_limit.py`). Tests reset them with an autouse
    fixture. Moving to several instances would need a shared store.

## Conventions

- **Comments:** short and explain *why*, not *what*. Match the density of the surrounding code.
- **Backend:** routers stay thin and put logic in `services/`. Raise `HTTPException` with a human-readable `detail`
  (the frontend shows it to the user). Log with `logging.getLogger("peerprep.<area>")`, never `print`, and never log
  emails, tokens or message contents.
- **Frontend:** a page composes features, a feature composes `components/ui`. Non-component helpers go in their own
  files (the react-refresh lint rule). Use the toast for success and failure feedback, and `ConfirmDialog` before
  destructive actions.
- **Commits:** short one-line messages; the owner's preference is no AI or co-author attribution.
- **Never commit:** `back/.env`, `back/.secret_key`, `*.db`, or the owner's local edit to `front/.gitignore`.

## Where to change what

| Task | Files |
|---|---|
| New API endpoint | router in `back/app/api/version_one/`, schema in `back/app/schemas/`, client fn in `front/src/utils/api.ts`, type in `front/src/types/api.ts`, hook in `front/src/hooks/` |
| New DB column/table | `back/app/models/*`, new `back/alembic/versions/000N_*.py`, cleanup in `back/app/services/cleanup.py` if it references users/events |
| New page | `front/src/pages/X.jsx` (call `usePageTitle`), lazy route in `front/src/App.jsx`, links in Navbar/Footer/MobileTabBar as needed |
| Design token / theme | `front/src/index.css` (`:root` light, `[data-theme="dark"]` dark, `@theme inline` mapping) |
| Event card / list look | `front/src/features/events/EventCard.jsx`, `EventCover.jsx`, `SeatTicks.jsx`, `EventList.jsx` |
| Chat behaviour | `back/app/api/version_one/event_chat.py`, `back/app/services/chat_state.py`, `front/src/hooks/useEventChat.js`, `front/src/features/events/detail/ChatPanel.jsx` |
| Whiteboard | `back/app/api/version_one/whiteboard.py`, `front/src/pages/Whiteboard.jsx`, `front/src/features/whiteboard/*` |
| XP / levels | `back/app/services/gamification.py`, `back/app/api/version_one/badges.py`, `front/src/features/profile/*` |
| Legal text / operator facts | `front/src/pages/{Privacy,Terms,Contact}.jsx`, `front/src/features/legal/legalInfo.js` |
| Security headers | API: `back/app/core/http.py`; site: `front/vercel.json` |
| Env vars | `back/app/core/config.py`, `back/.env.example`, `render.yaml`; frontend `VITE_API_BASE_URL` |
