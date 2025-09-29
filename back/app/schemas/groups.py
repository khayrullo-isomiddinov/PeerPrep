from pydantic import BaseModel, Field
from typing import Optional

class GroupCreate(BaseModel):
    name: str
    field: str
    exam: Optional[str] = None
    description: Optional[str] = None

class Group(GroupCreate):
    id: str = Field(...)
    members: int
