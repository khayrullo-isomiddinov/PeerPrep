from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone
import enum


# -------------------------------------------------
# EVENT TYPES
# -------------------------------------------------
class EventKind(str, enum.Enum):
    one_off = "one_off"


# -------------------------------------------------
# EVENT
# -------------------------------------------------
class EventBase(SQLModel):
    title: str
    starts_at: datetime
    location: str
    capacity: int = 10
    duration: int = 2
    description: Optional[str] = None
    kind: EventKind = EventKind.one_off
    exam: Optional[str] = None


class Event(EventBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    created_by: int = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    cover_image_url: Optional[str] = None
    study_materials: Optional[str] = None


# -------------------------------------------------
# USER
# -------------------------------------------------
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

    xp: int = Field(default=0, description="XP from events")


# -------------------------------------------------
# EVENT ATTENDEE
# -------------------------------------------------
class EventAttendee(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(index=True, foreign_key="event.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    joined_at: datetime = Field(default_factory=datetime.utcnow)


# -------------------------------------------------
# EVENT MESSAGE
# -------------------------------------------------
class EventMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(index=True, foreign_key="event.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = Field(default=False)


# -------------------------------------------------
# MESSAGE READ RECEIPTS
# -------------------------------------------------
class MessageRead(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int = Field(index=True)
    message_type: str = Field(default="event", const=True)

    user_id: int = Field(index=True, foreign_key="user.id")
    read_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
