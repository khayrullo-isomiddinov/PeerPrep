# Operations

## Local development

Prerequisites: Python 3.13, Node 22.

```bash
# Backend: must be started from back/ (otherwise "No module named 'app'")
cd back
pip install -r requirements.txt
cp .env.example .env            # then fill in; SQLite by default
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/api/health, docs at http://localhost:8000/docs (not in production)

# Frontend
cd front
npm install
npm run dev                     # http://localhost:5173 (needs CORS_ORIGINS to include it)
```

Sign-up without SMTP works locally because the verification link is shown on screen (`VERIFY_LINK_FALLBACK=true`).
Startup runs migrations and seeds the admin + 8 sample events into an empty database.

## Environment variables

### Backend (`back/app/core/config.py`, documented in `back/.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `ENVIRONMENT` | `development` | `production` disables API docs and adds HSTS |
| `APP_NAME`, `API_PREFIX` | `PeerPrep API`, `/api` | |
| `DATABASE_URL` | `sqlite:///./peerprep.db` | Postgres in production (`postgres://` is rewritten to `postgresql://`) |
| `CORS_ORIGINS` | localhost:5173 | JSON list or comma-separated exact origins |
| `CORS_ORIGIN_REGEX` | empty | extra origins, e.g. Vercel previews |
| `BACKEND_BASE_URL` | `http://localhost:8000` | used to build the verification link |
| `FRONTEND_BASE_URL` | `http://localhost:5173` | where `/auth/verify` redirects |
| `SECRET_KEY` | generated → `back/.secret_key` | JWT signing; set it explicitly in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 60 | token lifetime (the Privacy Policy states it via `LEGAL.sessionMinutes`) |
| `SMTP_SERVER`, `SMTP_PORT`, `EMAIL_USER`, `EMAIL_PASS` | gmail, 587, empty | verification emails |
| `VERIFY_LINK_FALLBACK` | `true` | return the verify link when email fails; `false` once email works |
| `OPENAI_API_KEY` | empty | enables the AI helpers (503 without it) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `admin@example.com`, empty | owner of the sample events; password ≥12 chars or random |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API origin without `/api`, baked in at **build** time. Must keep the `VITE_` prefix and be a plain (non-"Sensitive") variable in Vercel, or the build falls back to `http://localhost:8000` |

## Production

| Piece | Where | Notes |
|---|---|---|
| Frontend | Vercel project, root `front/`, `vercel.json` | Auto-deploys on push to `main`; previews per branch/PR |
| Backend | Render web service `peerprep-api-eu` (Frankfurt, free plan), `render.yaml` blueprint, root `back/` | Auto-deploys on push to `main`. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Health check `/api/health`. Free plan sleeps after ~15 min idle, so the first request takes ~50 s |
| Database | Neon project `polished-sea-59824182`, branch `production` (AWS eu-central-1) | Migrations run on every backend start |
| Old service | Render `peerprep-api` (…43x9, US) | obsolete; should be deleted |

Deploy = push to `main`. Frontend and backend changes that depend on each other (API shape, socket protocol)
should land in the same push; Vercel usually finishes before Render.

Post-deploy checks:
```bash
curl -s https://peerprep-api-eu.onrender.com/api/health/ready      # {"status":"ok","database":"up"}
curl -sI https://peerprep-api-eu.onrender.com/api/health | grep -i x-frame-options
curl -s -o /dev/null -w "%{http_code}" https://peerprep-api-eu.onrender.com/docs   # 404 when ENVIRONMENT=production
curl -sI https://peer-prep-gamma.vercel.app/ | grep -i content-security-policy
```

If the API host changes, update **both** Vercel's `VITE_API_BASE_URL` and `connect-src` in `front/vercel.json`.

## Quality gates

```bash
cd back  && python -m pytest -q
cd front && npm run lint && npm run typecheck && npm test && npm run build
```

There is no CI pipeline yet; run these before pushing.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ModuleNotFoundError: No module named 'app'` | Start uvicorn from `back/` |
| Two Vite servers (5173 and 5174) | One was already running; Vite picked the next port. Stop the extra one |
| `Cannot find module …/vite/dist/node/chunks/dep-*.js` | Dependencies changed under a running dev server. Restart `npm run dev` (clear `node_modules/.vite` if needed) |
| Browser CORS errors on every request | Origin missing from `CORS_ORIGINS`/`CORS_ORIGIN_REGEX`, or the API returned a 500 (Starlette's error response has no CORS headers, so check the Render logs) |
| Live site calls `localhost:8000` | `VITE_API_BASE_URL` missing, renamed, or marked Sensitive in Vercel; redeploy after fixing |
| Live site shows no data | API asleep (wait ~50 s), wrong `VITE_API_BASE_URL`, or CSP `connect-src` doesn't list the API host |
| Chat/whiteboard won't connect | Frontend and backend on different socket-auth versions (deploy both); or the user isn't a member (close code 1008) |
| 429 "Too many attempts" | Rate limit hit; counters reset on restart or after the window |
| Sign-up email never arrives | SMTP misconfigured or blocked by the host; check logs for "Verification email failed"; the fallback link shows only if `VERIFY_LINK_FALLBACK=true` |
| Tests hang on WebSocket tests | The test client must share one portal (see `tests/conftest.py`); newer Starlette gives each socket its own loop otherwise |
