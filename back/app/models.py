from typing import Optional, List
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
    
    # Profile fields
    name: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None

class EventAttendee(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(index=True, foreign_key="event.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    joined_at: datetime = Field(default_factory=datetime.utcnow)

class GroupMember(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: str = Field(index=True, foreign_key="group.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    is_leader: bool = False

class MissionSubmission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: str = Field(index=True, foreign_key="group.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    submission_url: str  # URL to video/proof
    submission_text: Optional[str] = None
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    is_approved: bool = False
    approved_by: Optional[int] = Field(default=None, foreign_key="user.id")
    approved_at: Optional[datetime] = None
    score: Optional[int] = None  # For leaderboard ranking
    feedback: Optional[str] = None

class Badge(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, foreign_key="user.id")
    group_id: str = Field(index=True, foreign_key="group.id")
    badge_name: str
    badge_description: Optional[str] = None
    earned_at: datetime = Field(default_factory=datetime.utcnow)
    mission_title: Optional[str] = None
