from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Group name")
    field: str = Field(..., min_length=1, max_length=50, description="Field of study")
    exam: Optional[str] = Field(None, max_length=100, description="Upcoming exam")
    description: Optional[str] = Field(None, max_length=1000, description="Mission description for the group")
    cover_image_url: Optional[str] = Field(None, description="Cover image URL")
    deadline: Optional[datetime] = Field(None, description="Group deadline")
    capacity: int = Field(10, ge=1, le=100, description="Maximum participants")

class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    field: Optional[str] = Field(None, min_length=1, max_length=50)
    exam: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    cover_image_url: Optional[str] = Field(None, description="Cover image URL")
    deadline: Optional[datetime] = None
    capacity: Optional[int] = Field(None, ge=1, le=100)

class Group(GroupCreate):
    id: str = Field(...)
    members: int
    created_by: int
    created_at: datetime

class GroupMember(BaseModel):
    id: int
    user_id: int
    group_id: str
    joined_at: datetime
    is_leader: bool

class GroupMemberWithUser(GroupMember):
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    user_photo_url: Optional[str] = None
    user_is_verified: Optional[bool] = None

class MissionSubmission(BaseModel):
    id: int
    group_id: str
    user_id: int
    submission_url: str
    submission_text: Optional[str] = None
    submitted_at: datetime
    is_approved: bool
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    score: Optional[int] = None
    feedback: Optional[str] = None
    quality_scores: Optional[dict] = None  # NLP quality analysis results
    auto_feedback: Optional[str] = None  # Auto-generated feedback

