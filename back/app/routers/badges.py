"""Badge system based on XP and accepted mission submissions"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from typing import Optional

from app.db import get_session
from app.models import MissionSubmission, User, EventAttendee, Event
from app.routers.auth import _get_user_from_token
from datetime import datetime

router = APIRouter(prefix="/badges", tags=["badges"])

XP_PER_APPROVED_SUBMISSION = 50
XP_PER_EVENT_ATTENDED = 30

BADGE_LEVELS = [
    {"name": "Beginner", "min_xp": 0, "icon": "🌱", "color": "green"},
    {"name": "Learner", "min_xp": 200, "icon": "📚", "color": "blue"},
    {"name": "Achiever", "min_xp": 500, "icon": "⭐", "color": "purple"},
    {"name": "Expert", "min_xp": 1500, "icon": "🏆", "color": "orange"},
    {"name": "Master", "min_xp": 4000, "icon": "👑", "color": "gold"},
]

def award_xp_for_submission(user_id: int, session: Session):
    """Award XP when a submission is approved"""
    user = session.exec(select(User).where(User.id == user_id)).first()
    if user:
        user.xp = (user.xp or 0) + XP_PER_APPROVED_SUBMISSION
        session.add(user)
        session.commit()

def award_xp_for_event(user_id: int, event_id: int, session: Session):
    """Award XP when user attends an event (after event date passes)"""
    user = session.exec(select(User).where(User.id == user_id)).first()
    event = session.exec(select(Event).where(Event.id == event_id)).first()
    
    if user and event:
        if event.starts_at < datetime.utcnow():
            user.xp = (user.xp or 0) + XP_PER_EVENT_ATTENDED
            session.add(user)
            session.commit()

def get_user_badge_level(user_id: int, session: Session) -> Optional[dict]:
    """Calculate user's badge level based on total XP"""
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        return None
    
    total_xp = user.xp or 0
    
    badge_level = None
    for level in reversed(BADGE_LEVELS):
        if total_xp >= level["min_xp"]:
            badge_level = level
            break
    
    return badge_level

@router.get("/user/{user_id}")
def get_user_badge(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Get badge for a specific user based on their accepted submissions"""
    
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    badge_level = get_user_badge_level(user_id, session)
    
    user = session.exec(select(User).where(User.id == user_id)).first()
    total_xp = user.xp or 0 if user else 0
    
    total_submissions = session.exec(
        select(func.count(MissionSubmission.id)).where(
            MissionSubmission.user_id == user_id,
            MissionSubmission.is_approved == True
        )
    ).one()
    
    events_attended = session.exec(
        select(func.count(EventAttendee.id)).where(
            EventAttendee.user_id == user_id
        )
    ).one()
    
    return {
        "user_id": user_id,
        "badge": badge_level,
        "total_xp": total_xp,
        "total_accepted_submissions": total_submissions,
        "events_attended": events_attended
    }

@router.get("/me")
def get_my_badge(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Get current user's badge"""
    return get_user_badge(current_user.id, session)

