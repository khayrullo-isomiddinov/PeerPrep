from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class EventAttendee(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(index=True, foreign_key="event.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    xp_awarded: bool = Field(default=False, index=True)  # Track if XP has been awarded for this event
