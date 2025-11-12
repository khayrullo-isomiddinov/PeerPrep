from typing import Optional, List
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone
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
    cover_image_url: Optional[str] = None
    study_materials: Optional[str] = Field(default=None, description="JSON array of study material files")

class GroupBase(SQLModel):
    name: str
    field: str
    exam: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    deadline: Optional[datetime] = None
    capacity: int = 10

class Group(GroupBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True, index=True)
    members: int = 0
    created_by: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

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
    
    name: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    xp: int = Field(default=0, description="Experience points earned from activities")

class EventAttendee(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(index=True, foreign_key="event.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    joined_at: datetime = Field(default_factory=datetime.utcnow)

class EventMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(index=True, foreign_key="event.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = Field(default=False)

class GroupMember(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: str = Field(index=True, foreign_key="group.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    is_leader: bool = False

class GroupMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: str = Field(index=True, foreign_key="group.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageRead(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int = Field(index=True)
    message_type: str = Field(index=True)  # "event" or "group"
    user_id: int = Field(index=True, foreign_key="user.id")
    read_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageReaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int = Field(index=True)
    message_type: str = Field(index=True)  # "event" or "group"
    user_id: int = Field(index=True, foreign_key="user.id")
    emoji: str = Field(max_length=10)  # Emoji character (e.g., "👍", "❤️", "😂")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MissionSubmission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: str = Field(index=True, foreign_key="group.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    submission_url: str
    submission_text: Optional[str] = None
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    is_approved: bool = False
    approved_by: Optional[int] = Field(default=None, foreign_key="user.id")
    approved_at: Optional[datetime] = None
    score: Optional[int] = None  
    feedback: Optional[str] = None

class Follow(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    follower_id: int = Field(index=True, foreign_key="user.id")
    following_id: int = Field(index=True, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Prevent duplicate follows - this will be enforced at the database level
    # SQLModel doesn't support composite unique constraints directly, 
    # but we check in the router before creating
