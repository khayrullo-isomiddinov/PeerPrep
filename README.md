## PeerPrep - Local Development 

Follow these steps to run the project locally (Windows/macOS/Linux).

### 1) Prerequisites
- Python 3.11+ and pip
- Node.js 20+ and npm
- Git

Optional (for emails): a test SMTP account (e.g. Gmail App Password, Mailtrap)

### 2) Clone the repo
```bash
git clone https://github.com/khayrullo-isomiddinov/PeerPrep.git
cd PeerPrep
```

### 3) Backend (FastAPI + SQLModel)
```bash
cd back

# Create & activate virtual environment
# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate
# macOS/Linux
# python -m venv .venv
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in `back/` (next to `requirements.txt`). This template works out of the box; tweak as needed:
```env
APP_NAME=PeerPrep API
API_PREFIX=/api

# SQLite (default) – file will be created automatically
DATABASE_URL=sqlite:///./peerprep.db

# CORS for frontend dev server
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]

# Public URL where the backend is reachable (for email links)
BACKEND_BASE_URL=http://localhost:8000

# Email (optional for verification)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=
EMAIL_PASS=

# Auth
SECRET_KEY=change_me
ACCESS_TOKEN_EXPIRE_MINUTES=15
```

Run the API in dev mode:
```bash
# Still inside back/
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health check:
```bash
curl http://localhost:8000/api/health
# -> {"status":"ok"}
```

Notes:
- The SQLite DB file `peerprep.db` is created automatically, and database migrations run on every startup.
- If SMTP details are blank, registration still works; the API returns a verify URL in the response for manual copy.

### 4) Frontend (React + Vite)
Open a second terminal:
```bash
cd front
npm install
npm run dev
```

The app runs on `http://localhost:5173`. It calls the backend at `http://localhost:8000/api` by default; set `VITE_API_BASE_URL` (see `front/.env.example`) to point it elsewhere.

### 5) Common Tasks
- Build frontend for production:
```bash
cd front && npm run build && npm run preview
```

- Run the checks:
```bash
cd back && python -m pytest          # backend tests
cd front && npm test                 # frontend tests
cd front && npm run typecheck        # TypeScript
cd front && npm run lint
```

- Change the database schema: edit a model in `back/app/models/`, then generate and review a migration.
  It is applied automatically on the next startup (locally and on Render).
```bash
cd back
alembic revision --autogenerate -m "add phone to user"
alembic upgrade head                 # optional: apply now instead of on startup
```

- Reset database (delete local DB):
```bash
cd back && del peerprep.db   # Windows
# or: rm back/peerprep.db    # macOS/Linux (adjust path)
```

### 6) Troubleshooting
- Backend port in use (8000): change `--port` or stop the other process.
- Frontend port in use (5173): `npm run dev -- --port 5174`.
- CORS errors: ensure backend is running and `CORS_ORIGINS` contains the frontend URL.
- Email not sending: check `EMAIL_USER`/`EMAIL_PASS` and provider settings. For local testing, rely on the verify URL returned by the API.
- 401 after login: backend must be running; token is stored in LocalStorage; hard-refresh after backend restarts.

### 7) Useful Endpoints
- `GET /api/health` – liveness (process is up)
- `GET /api/health/ready` – readiness (database reachable; 503 if not)
- `POST /api/auth/register` – returns message or verify URL
- `GET /api/auth/verify?token=...` – sets user verified and redirects to `/login`
- `POST /api/auth/login` – returns JWT and user object
- `GET /api/events` – list events
- `POST /api/events` – create event (requires Bearer token)

### 8) Project Structure (high level)
- `back/` – FastAPI app (SQLModel, JWT auth, email verification)
  - `app/api/version_one/` – routes: `auth`, `events`, `event_chat` (chat + WebSocket), `whiteboard`, `badges`
  - `app/services/` – shared logic (`event_queries`, `chat_state`, `cleanup`, gamification, AI, email)
  - `alembic/` – database migrations
- `front/` – React + Vite app
  - `src/pages/` – one file per route; `src/features/` – feature components; `src/hooks/` – React Query data hooks
  - `src/components/ui/` – shared UI (Button, Card, Badge, ConfirmDialog, toasts)
  - `src/utils/api.ts`, `src/types/api.ts` – typed API client

That’s it! Open two terminals, run backend and frontend, and you’re ready to develop.
