from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime
from app.models import MissionStatus

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Group name")
    field: str = Field(..., min_length=1, max_length=50, description="Field of study")
    exam: Optional[str] = Field(None, max_length=100, description="Upcoming exam")
    description: Optional[str] = Field(None, max_length=500, description="Group description")
    
    # Mission fields
    mission_title: Optional[str] = Field(None, max_length=100, description="Mission title")
    mission_description: Optional[str] = Field(None, max_length=1000, description="Mission description")
    mission_deadline: Optional[datetime] = Field(None, description="Mission deadline")
    mission_capacity: int = Field(10, ge=1, le=100, description="Maximum participants")
    mission_badge_name: Optional[str] = Field(None, max_length=50, description="Badge name for completion")
    mission_badge_description: Optional[str] = Field(None, max_length=200, description="Badge description")
    
    @field_validator('mission_deadline')
    def validate_deadline(cls, v):
        if v and v <= datetime.utcnow():
            raise ValueError('Mission deadline must be in the future')
        return v

    @model_validator(mode="after")
    def validate_mission_pair(self):
        title = self.mission_title
        desc = self.mission_description
        if title and not desc:
            raise ValueError('Mission description is required when mission title is provided')
        if desc and not title:
            raise ValueError('Mission title is required when mission description is provided')
        return self

class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    field: Optional[str] = Field(None, min_length=1, max_length=50)
    exam: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    mission_title: Optional[str] = Field(None, max_length=100)
    mission_description: Optional[str] = Field(None, max_length=1000)
    mission_deadline: Optional[datetime] = None
    mission_capacity: Optional[int] = Field(None, ge=1, le=100)
    mission_status: Optional[MissionStatus] = None
    mission_badge_name: Optional[str] = Field(None, max_length=50)
    mission_badge_description: Optional[str] = Field(None, max_length=200)

class Group(GroupCreate):
    id: str = Field(...)
    members: int
    created_by: int
    created_at: datetime
    mission_status: MissionStatus

class GroupMember(BaseModel):
    id: int
    user_id: int
    group_id: str
    joined_at: datetime
    is_leader: bool

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

class Badge(BaseModel):
    id: int
    user_id: int
    group_id: str
    badge_name: str
    badge_description: Optional[str] = None
    earned_at: datetime
    mission_title: Optional[str] = None

class LeaderboardEntry(BaseModel):
    user_id: int
    user_email: str
    score: int
    rank: int
    submission_id: int
    submitted_at: datetime
    is_approved: bool
