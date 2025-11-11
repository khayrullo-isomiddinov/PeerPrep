from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import init_db
from app.db import get_session
from app.seed import seed_db
from app.routers import health as health_router
from app.routers import events as events_router
from app.routers import groups as groups_router
from app.routers import locations as locations_router
from app.routers import auth as auth_router
from app.routers import missions as missions_router
from app.routers import badges as badges_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Run migrations
    try:
        from app.migrations import run_migrations
        run_migrations()
    except Exception as e:
        print(f"Migration warning: {e}")
    try:
        gen = get_session()
        session = next(gen)
        try:
            seed_db(session)
        finally:
            try:
                next(gen)
            except StopIteration:
                pass
    except Exception:
        pass
    yield

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health_router.router, prefix=settings.API_PREFIX)
app.include_router(auth_router.router, prefix=settings.API_PREFIX)
app.include_router(events_router.router, prefix=settings.API_PREFIX)
app.include_router(groups_router.router, prefix=settings.API_PREFIX)
app.include_router(locations_router.router, prefix=settings.API_PREFIX)
app.include_router(missions_router.router, prefix=settings.API_PREFIX)
app.include_router(badges_router.router, prefix=settings.API_PREFIX)
