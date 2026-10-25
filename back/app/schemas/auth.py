from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from app.schemas.validators import image_url

MIN_PASSWORD_LENGTH = 8


def _normalize_email(v):
    # Emails are matched case-insensitively, so "Harry@Gmail.com" and "harry@gmail.com" are one account
    return v.strip().lower() if isinstance(v, str) else v


class RegisterIn(BaseModel):
    email: EmailStr
    password: str

    _email = field_validator("email", mode="before")(_normalize_email)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str

    _email = field_validator("email", mode="before")(_normalize_email)


class ResendVerificationIn(BaseModel):
    email: EmailStr

    _email = field_validator("email", mode="before")(_normalize_email)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_length(cls, v):
        if v is not None and len(v.strip()) > 100:
            raise ValueError("Name must be at most 100 characters")
        return v.strip() if v is not None else v

    _photo = field_validator("photo_url")(image_url("Profile photo"))

    @field_validator("bio")
    @classmethod
    def bio_length(cls, v):
        if v is not None and len(v) > 1000:
            raise ValueError("Bio must be at most 1000 characters")
        return v
