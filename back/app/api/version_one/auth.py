import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, Header, Response
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select, func
from sqlalchemy import text as sql_text
from app.core.db import get_session
from app.models import User
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.core.config import settings
from app.core import rate_limit
from app.schemas.auth import RegisterIn, LoginIn, ResendVerificationIn, ProfileUpdate
import secrets
from app.services.email import send_email
from app.services.cleanup import delete_user_data
from app.services.users import public_user
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("peerprep.auth")

# Failed sign-ins allowed per account before it's locked for the rest of the window (stops password guessing
# spread across many IPs); the per-IP limits on each route stop one client hammering many accounts.
LOGIN_FAILURES_PER_ACCOUNT = 10
LOGIN_FAILURE_WINDOW = 15 * 60

@router.options("/register")
@router.options("/login")
async def options_auth():
    """Handle CORS preflight for auth endpoints"""
    return {}


def _find_user_by_email(session: Session, email: str) -> Optional[User]:
    # Older accounts may have been stored with mixed-case emails
    return session.exec(select(User).where(func.lower(User.email) == email.lower())).first()


def _user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "bio": user.bio,
        "photo_url": user.photo_url,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat(),
        "xp": user.xp or 0,
    }


async def _send_verification(user: User, token: str) -> dict:
    """Email the verification link. If sending fails and VERIFY_LINK_FALLBACK is on, return the link
    instead so sign-up still works without email (local development, or before email is set up)."""
    verify_url = f"{settings.BACKEND_BASE_URL}{settings.API_PREFIX}/auth/verify?token={token}"
    html = f"<p>Verify your email:</p><p><a href='{verify_url}'>{verify_url}</a></p>"
    try:
        # smtplib is blocking, so keep it off the event loop
        await asyncio.to_thread(send_email, to=user.email, subject="Verify your PeerPrep account", html=html)
        return {"email_sent": True}
    except Exception as e:
        # Log the account id, not the address: logs shouldn't collect personal data
        logger.warning("Verification email failed for user %s: %s", user.id, type(e).__name__)
        if not settings.VERIFY_LINK_FALLBACK:
            raise HTTPException(status_code=503, detail="We couldn't send the verification email. Please try again later.")
        return {"email_sent": False, "verify_url": verify_url}


@router.post("/register", dependencies=[Depends(rate_limit.limit_by_ip("register", 5, 600))])
async def register(data: RegisterIn, session: Session = Depends(get_session)):
    existing = _find_user_by_email(session, data.email)
    if existing and existing.is_verified:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Try signing in instead.")

    token = secrets.token_urlsafe(32)
    if existing:
        # Registered before but never verified: send a fresh link. The original password is kept,
        # so nobody can take over a pending account by registering it again.
        existing.verification_token = token
        session.add(existing)
        session.commit()
        result = await _send_verification(existing, token)
        message = (
            "This email is already registered but not verified yet. We've sent you a new verification link."
            if result["email_sent"] else
            "This email is already registered but not verified yet. Use the link below to verify it."
        )
        return {"message": message, **result}

    from app.core.db import engine
    columns = []
    if engine.dialect.name == "sqlite":
        # Only the old local SQLite database can have the legacy columns; PRAGMA is SQLite-only
        with engine.connect() as conn:
            columns = [row[1] for row in conn.execute(sql_text("PRAGMA table_info(user)")).fetchall()]

    if "is_active" in columns:
        # Legacy databases have extra NOT NULL columns the model doesn't know about
        with engine.begin() as conn:
            conn.execute(sql_text("""
                INSERT INTO user (email, hashed_password, is_verified, verification_token, created_at, is_active, xp)
                VALUES (:email, :hashed_password, :is_verified, :verification_token, :created_at, 1, 0)
            """), {
                "email": data.email,
                "hashed_password": hash_password(data.password),
                "is_verified": 0,
                "verification_token": token,
                "created_at": datetime.utcnow()
            })
        user = _find_user_by_email(session, data.email)
    else:
        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            is_verified=False,
            verification_token=token,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    result = await _send_verification(user, token)
    message = (
        "Account created! Check your email for a link to verify your account."
        if result["email_sent"] else
        "Account created! We couldn't send the verification email, so use the link below to verify your account."
    )
    return {"message": message, **result}


@router.post("/resend-verification", dependencies=[Depends(rate_limit.limit_by_ip("resend", 5, 600))])
async def resend_verification(data: ResendVerificationIn, session: Session = Depends(get_session)):
    # Also per address, so nobody can flood someone's inbox from many IPs
    rate_limit.hit(f"resend:email:{data.email}", 3, 600)
    user = _find_user_by_email(session, data.email)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email.")
    if user.is_verified:
        return {"message": "This email is already verified. You can sign in.", "already_verified": True}

    token = secrets.token_urlsafe(32)
    user.verification_token = token
    session.add(user)
    session.commit()
    result = await _send_verification(user, token)
    message = (
        "We've sent a new verification link to your email."
        if result["email_sent"] else
        "We couldn't send the verification email. Use the link below to verify your account."
    )
    return {"message": message, **result}


@router.post("/login", dependencies=[Depends(rate_limit.limit_by_ip("login", 10, 60))])
def login(data: LoginIn, session: Session = Depends(get_session)):
    failures_key = f"login:fail:{data.email}"
    # Checked before the password, so a locked account doesn't reveal whether a guess was right
    rate_limit.check(failures_key, LOGIN_FAILURES_PER_ACCOUNT, LOGIN_FAILURE_WINDOW)
    user = _find_user_by_email(session, data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        rate_limit.hit(failures_key, LOGIN_FAILURES_PER_ACCOUNT, LOGIN_FAILURE_WINDOW)
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    rate_limit.reset(failures_key)
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before signing in.")
    token = create_access_token(str(user.id), settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {"access_token": token, "token_type": "bearer", "user": _user_payload(user)}


@router.get("/verify")
def verify_email(token: str, session: Session = Depends(get_session)):
    frontend_login = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/login"
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

def _get_optional_user_from_token(
    session: Session = Depends(get_session),
    authorization: str | None = Header(default=None)
) -> Optional[User]:
    """Get user from token if provided, otherwise return None (for public endpoints)"""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        return None
    user = session.exec(select(User).where(User.id == user_id)).first()
    return user

@router.get("/me")
def me(response: Response, current_user: User = Depends(_get_user_from_token)):
    # Never cache: a cached /me makes profile edits look unsaved after a reload
    response.headers["Cache-Control"] = "no-store"
    return _user_payload(current_user)

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
    return _user_payload(current_user)

@router.get("/user/{user_id}")
def get_user_profile(user_id: int, session: Session = Depends(get_session)):
    """Someone's public profile. No email: that's only returned to its owner by /me."""
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        **public_user(user),
        "bio": user.bio,
        "created_at": user.created_at.isoformat(),
        "xp": user.xp or 0,
    }

@router.delete("/account")
def delete_account(
    current_user: User = Depends(_get_user_from_token),
    session: Session = Depends(get_session)
):
    if current_user.email == settings.ADMIN_EMAIL:
        raise HTTPException(
            status_code=403, 
            detail="Admin account cannot be deleted"
        )
    
    delete_user_data(session, current_user)
    session.delete(current_user)
    session.commit()
    
    return {"message": "Account deleted successfully"}
