from pydantic import BaseModel, EmailStr
from typing import Optional

class RegisterIn(BaseModel):
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None

class UserProfile(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: str
