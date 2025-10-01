from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime

class EventBase(SQLModel):
    title: str
    date: str
    time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    tag: Optional[str] = None

class Event(EventBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True, index=True)

class EventCreate(EventBase):
    pass

class GroupBase(SQLModel):
    name: str
    field: str
    exam: Optional[str] = None
    description: Optional[str] = None

class Group(GroupBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True, index=True)
    members: int = 0

class GroupCreate(GroupBase):
    pass

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    email: str = Field(index=True, unique=True, nullable=False)
    hashed_password: str
    is_active: bool = True
    is_verified: bool = Field(default=False, nullable=False)
    verification_token: Optional[str] = Field(default=None, index=True, nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
