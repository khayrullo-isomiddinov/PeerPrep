from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class EventMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(index=True, foreign_key="event.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = Field(default=False)
