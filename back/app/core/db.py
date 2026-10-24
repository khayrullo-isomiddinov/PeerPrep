from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings


def _database_url(url: str) -> str:
    # Some hosts hand out "postgres://", which SQLAlchemy no longer accepts
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]
    return url


DATABASE_URL = _database_url(settings.DATABASE_URL)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
if DATABASE_URL.startswith("sqlite"):
    from sqlalchemy.pool import NullPool
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        poolclass=NullPool,
        pool_pre_ping=True
    )
else:
    # Small pool: free-tier Postgres allows few connections, and idle ones get closed,
    # so check connections before use and recycle them often
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_recycle=300
    )

def init_db() -> None:
    from app.models import (
        User, Event, EventAttendee, EventMessage, MessageRead, WhiteboardElement
    )
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
