from typing import Optional
from sqlmodel import SQLModel
from pydantic import field_validator
from datetime import datetime, timezone
from app.schemas.validators import image_url, optional_text, check_study_materials

MAX_CAPACITY = 1000
MAX_DURATION_HOURS = 24


def _required_text(field: str, max_length: int):
    def check(v):
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError(f"{field} is required")
        if len(v) > max_length:
            raise ValueError(f"{field} must be at most {max_length} characters")
        return v
    return check


def _check_capacity(v):
    if v is not None and not 1 <= v <= MAX_CAPACITY:
        raise ValueError(f"Capacity must be between 1 and {MAX_CAPACITY}")
    return v


def _check_duration(v):
    if v is not None and not 1 <= v <= MAX_DURATION_HOURS:
        raise ValueError(f"Duration must be between 1 and {MAX_DURATION_HOURS} hours")
    return v


def as_utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


class EventBase(SQLModel):
    title: str
    starts_at: datetime
    location: str
    capacity: int = 10
    duration: int = 2
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    study_materials: Optional[str] = None
    exam: Optional[str] = None


class EventCreate(EventBase):
    _title = field_validator("title")(_required_text("Title", 200))
    _location = field_validator("location")(_required_text("Location", 300))
    _capacity = field_validator("capacity")(_check_capacity)
    _duration = field_validator("duration")(_check_duration)
    _description = field_validator("description")(optional_text("Description", 5000))
    _exam = field_validator("exam")(optional_text("Exam", 100))
    _cover = field_validator("cover_image_url")(image_url("Cover image"))
    _materials = field_validator("study_materials")(check_study_materials)

    @field_validator("starts_at")
    @classmethod
    def must_be_future(cls, v: datetime) -> datetime:
        if as_utc(v) <= datetime.now(timezone.utc):
            raise ValueError("Start time must be in the future")
        return v


class EventRead(EventBase):
    id: int
    created_by: int
    created_at: datetime
    ends_at: datetime
    is_past: bool
    is_ongoing: bool
    is_upcoming: bool
    status: str


    attendee_count: Optional[int] = None
    is_joined: Optional[bool] = None


class EventUpdate(SQLModel):
    title: Optional[str] = None
    starts_at: Optional[datetime] = None
    location: Optional[str] = None
    capacity: Optional[int] = None
    duration: Optional[int] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    study_materials: Optional[str] = None
    exam: Optional[str] = None

    _title = field_validator("title")(_required_text("Title", 200))
    _location = field_validator("location")(_required_text("Location", 300))
    _capacity = field_validator("capacity")(_check_capacity)
    _duration = field_validator("duration")(_check_duration)
    _description = field_validator("description")(optional_text("Description", 5000))
    _exam = field_validator("exam")(optional_text("Exam", 100))
    _cover = field_validator("cover_image_url")(image_url("Cover image"))
    _materials = field_validator("study_materials")(check_study_materials)
