from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class MessageRead(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int = Field(index=True)
    message_type: str = Field(default="event")
    user_id: int = Field(index=True, foreign_key="user.id")
    read_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
