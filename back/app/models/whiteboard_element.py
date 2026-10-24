from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class WhiteboardElement(SQLModel, table=True):
    """A single drawable item (stroke, shape, text, sticky note) on an event's shared whiteboard."""
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(index=True, foreign_key="event.id")
    element_id: str = Field(index=True, max_length=64)  # client-generated id, unique per event
    data: str  # JSON-encoded element payload
    created_by: int = Field(foreign_key="user.id")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
