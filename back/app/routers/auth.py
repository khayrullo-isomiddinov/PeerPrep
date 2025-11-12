from fastapi import APIRouter, Depends, HTTPException, Header, Response
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select
from app.db import get_session
from app.models import User
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.config import settings
from app.schemas.auth import RegisterIn, LoginIn, ProfileUpdate, UserProfile
import secrets
from app.services.email import send_email
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
async def register(data: RegisterIn, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    token = secrets.token_urlsafe(32)
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        is_verified=False,
        verification_token=token,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    verify_url = f"{settings.BACKEND_BASE_URL}{settings.API_PREFIX}/auth/verify?token={token}"
    html = f"<p>Verify your email:</p><p><a href='{verify_url}'>{verify_url}</a></p>"
    try:
        await send_email(to=user.email, subject="Verify your PeerPrep account", html=html)
        return {"message": "Registration successful. Please check your email to verify your account."}
    except Exception as e:
        return {
            "message": "Registration successful, but email could not be sent. Use this link to verify:",
            "verify_url": verify_url,
            "error": str(e)
        }

@router.post("/login")
def login(data: LoginIn, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    token = create_access_token(str(user.id), settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "bio": user.bio,
            "photo_url": user.photo_url,
            "is_verified": user.is_verified,
            "created_at": user.created_at.isoformat(),
        }
    }

@router.get("/verify")
def verify_email(token: str, session: Session = Depends(get_session)):
    frontend_login = "http://localhost:5173/#/login"
    user = session.exec(select(User).where(User.verification_token == token)).first()
    if not user:
        return RedirectResponse(url=f"{frontend_login}?verified=0", status_code=303)
    user.is_verified = True
    user.verification_token = None
    session.add(user)
    session.commit()
    return RedirectResponse(url=f"{frontend_login}?verified=1", status_code=303)

def _get_user_from_token(
    session: Session = Depends(get_session),
    authorization: str | None = Header(default=None)
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.get("/me")
def me(response: Response, current_user: User = Depends(_get_user_from_token)):
    response.headers["Cache-Control"] = "private, max-age=300"
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "bio": current_user.bio,
        "photo_url": current_user.photo_url,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat(),
    }

@router.put("/profile")
def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(_get_user_from_token),
    session: Session = Depends(get_session)
):
    if profile_data.name is not None:
        current_user.name = profile_data.name
    if profile_data.bio is not None:
        current_user.bio = profile_data.bio
    if profile_data.photo_url is not None:
        current_user.photo_url = profile_data.photo_url if profile_data.photo_url else None
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "bio": current_user.bio,
        "photo_url": current_user.photo_url,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat(),
    }

@router.delete("/account")
def delete_account(
    current_user: User = Depends(_get_user_from_token),
    session: Session = Depends(get_session)
):
    """Delete user account (except admin)"""
    
    if current_user.email == settings.ADMIN_EMAIL:
        raise HTTPException(
            status_code=403, 
            detail="Admin account cannot be deleted"
        )
    
    session.delete(current_user)
    session.commit()
    
    return {"message": "Account deleted successfully"}
