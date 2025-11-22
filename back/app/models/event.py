from typing import Optional
from datetime import datetime, timedelta
from sqlmodel import SQLModel, Field


class EventBase(SQLModel):
    title: str
    starts_at: datetime
    location: str
    capacity: int = 10
    duration: int = 2
    description: Optional[str] = None
    exam: Optional[str] = None


class Event(EventBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    created_by: int = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    cover_image_url: Optional[str] = None
    study_materials: Optional[str] = None

    @property
    def ends_at(self):
        return self.starts_at + timedelta(hours=self.duration)

    @property
    def is_past(self):
        return datetime.utcnow() >= self.ends_at

    @property
    def is_ongoing(self):
        now = datetime.utcnow()
        return self.starts_at <= now < self.ends_at

    @property
    def is_upcoming(self):
        return datetime.utcnow() < self.starts_at
