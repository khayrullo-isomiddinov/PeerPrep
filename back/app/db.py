from sqlmodel import SQLModel, create_engine, Session
from app.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

def init_db() -> None:
    from app import models
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

