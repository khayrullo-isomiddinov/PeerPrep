from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text
from app.core.db import engine

router = APIRouter()


@router.get("/health")
def health():
    """Liveness: the process is up. Doesn't touch the database, so frequent checks don't keep it awake."""
    return {"status": "ok"}


@router.get("/health/ready")
def ready():
    """Readiness: the database answers."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse({"status": "unavailable", "database": "down"}, status_code=503)
    return {"status": "ok", "database": "up"}
