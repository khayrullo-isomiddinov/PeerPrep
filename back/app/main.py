from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.config import settings
from app.db import init_db, engine
from app.seed import seed_db
from sqlmodel import Session
from app.routers import health as health_router
from app.routers import events as events_router
from app.routers import locations as locations_router
from app.routers import auth as auth_router
from app.routers import badges as badges_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    try:
        from app.migrations import run_migrations
        run_migrations()
    except Exception as e:
        print(f"Migration warning: {e}")
    
    # Seed database
    try:
        with Session(engine) as session:
            seed_db(session)
    except Exception as e:
        print(f"Seed warning: {e}")
    
    yield

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Add response compression for large JSON responses (only compress > 2KB to avoid overhead)
app.add_middleware(GZipMiddleware, minimum_size=2000)

app.include_router(health_router.router, prefix=settings.API_PREFIX)
app.include_router(auth_router.router, prefix=settings.API_PREFIX)
app.include_router(events_router.router, prefix=settings.API_PREFIX)
app.include_router(locations_router.router, prefix=settings.API_PREFIX)
app.include_router(badges_router.router, prefix=settings.API_PREFIX)
