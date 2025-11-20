from typing import Optional
from sqlmodel import SQLModel
from datetime import datetime
from app.models import EventKind

class EventBase(SQLModel):
    title: str
    starts_at: datetime
    location: str
    capacity: int = 10
    duration: int = 2
    description: Optional[str] = None
    kind: EventKind = EventKind.one_off
    cover_image_url: Optional[str] = None
    study_materials: Optional[str] = None
    exam: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventRead(EventBase):
    id: int
    created_by: int
    created_at: datetime

class EventUpdate(SQLModel):
    title: Optional[str] = None
    starts_at: Optional[datetime] = None
    location: Optional[str] = None
    capacity: Optional[int] = None
    duration: Optional[int] = None
    description: Optional[str] = None
    kind: Optional[EventKind] = None
    cover_image_url: Optional[str] = None
    study_materials: Optional[str] = None
    exam: Optional[str] = None
