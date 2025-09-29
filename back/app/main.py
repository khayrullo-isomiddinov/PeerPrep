from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import init_db
from app.routers import health as health_router
from app.routers import events as events_router
from app.routers import groups as groups_router

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(health_router.router, prefix=settings.API_PREFIX)
app.include_router(events_router.router, prefix=f"{settings.API_PREFIX}/events", tags=["events"])
app.include_router(groups_router.router, prefix=f"{settings.API_PREFIX}/groups", tags=["groups"])
