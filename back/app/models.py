from typing import Optional
from sqlmodel import SQLModel, Field

class EventBase(SQLModel):
    title: str
    date: str
    time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    tag: Optional[str] = None

class Event(EventBase, table=True):
    id: str | None = Field(default=None, primary_key=True, index=True)

class EventCreate(EventBase):
    pass

class GroupBase(SQLModel):
    name: str
    field: str
    exam: Optional[str] = None
    description: Optional[str] = None

class Group(GroupBase, table=True):
    id: str | None = Field(default=None, primary_key=True, index=True)
    members: int = 0

class GroupCreate(GroupBase):
    pass
