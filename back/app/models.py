from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime
import enum

class EventKind(str, enum.Enum):
    group = "group"
    one_off = "one_off"

class EventBase(SQLModel):
    title: str
    starts_at: datetime
    location: str
    capacity: int = 10
    description: Optional[str] = None
    group_id: Optional[int] = None
    kind: EventKind = EventKind.one_off

class Event(EventBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    created_by: int = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

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

class EventAttendee(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(index=True, foreign_key="event.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    joined_at: datetime = Field(default_factory=datetime.utcnow)
