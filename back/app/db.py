from sqlmodel import SQLModel, create_engine, Session
from app.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
# Connection pool settings - SQLite doesn't support pool_size, but we can use NullPool for better connection management
if settings.DATABASE_URL.startswith("sqlite"):
    from sqlalchemy.pool import NullPool
    engine = create_engine(
        settings.DATABASE_URL, 
        connect_args=connect_args, 
        poolclass=NullPool,  # Use NullPool for SQLite to avoid connection pool issues
        pool_pre_ping=True
    )
else:
    engine = create_engine(
        settings.DATABASE_URL, 
        connect_args=connect_args, 
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600
    )

def init_db() -> None:
    from app import models
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

