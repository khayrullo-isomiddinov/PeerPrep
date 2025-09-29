from pydantic import BaseModel, Field
from typing import Optional

class EventCreate(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    tag: Optional[str] = None

class Event(EventCreate):
    id: str = Field(...)
