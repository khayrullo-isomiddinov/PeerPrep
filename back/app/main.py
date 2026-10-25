from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.core.config import settings
from app.core.db import engine
from app.core.migrations import run_migrations
from app.seed import seed_db
from sqlmodel import Session
from app.api.version_one import health as health_router
from app.api.version_one import auth as auth_router
from app.api.version_one import badges as badges_router
from app.api.version_one import events as events_router
from app.api.version_one import event_chat as event_chat_router
from app.api.version_one import whiteboard as whiteboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    try:
        with Session(engine) as session:
            seed_db(session)
    except Exception as e:
        print(f"Seed warning: {e}")
    
    yield

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=2000)

app.include_router(health_router.router, prefix=settings.API_PREFIX)
app.include_router(auth_router.router, prefix=settings.API_PREFIX)
app.include_router(badges_router.router, prefix=settings.API_PREFIX)
app.include_router(events_router.router, prefix=settings.API_PREFIX)
app.include_router(event_chat_router.router, prefix=settings.API_PREFIX)
app.include_router(whiteboard_router.router, prefix=settings.API_PREFIX)

