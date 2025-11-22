from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    email: str = Field(index=True, unique=True, nullable=False)
    hashed_password: str
    is_verified: bool = Field(default=False, nullable=False)
    verification_token: Optional[str] = Field(default=None, index=True, nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    name: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None

    xp: int = Field(default=0)
