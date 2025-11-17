"""Advanced Badge system with multi-factor XP calculation and engagement prediction"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from typing import Optional

from app.db import get_session
from app.models import MissionSubmission, User, EventAttendee, Event
from app.routers.auth import _get_user_from_token
from app.services.gamification import (
    AdvancedBadgeSystem, EngagementPredictor,
    award_dynamic_xp_for_submission, award_dynamic_xp_for_event
)

router = APIRouter(prefix="/badges", tags=["badges"])

def award_xp_for_submission(user_id: int, submission_id: int, session: Session) -> int:
    """
    Award dynamically calculated XP when a submission is approved.
    
    Args:
        user_id: The ID of the user who submitted
        submission_id: The ID of the submission (required for dynamic XP calculation)
        session: Database session
        
    Returns:
        The amount of XP awarded
    """
    return award_dynamic_xp_for_submission(user_id, submission_id, session)

def award_xp_for_event(user_id: int, event_id: int, session: Session) -> int:
    """Award dynamically calculated XP when user attends an event (after event date passes)"""
    return award_dynamic_xp_for_event(user_id, event_id, session)

def get_user_badge_level(user_id: int, session: Session) -> Optional[dict]:
    """Calculate user's badge level using advanced multi-dimensional requirements"""
    return AdvancedBadgeSystem.check_badge_unlock(user_id, session)

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
    total_xp = user.xp or 0
    
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
    
    engagement_score = EngagementPredictor.calculate_engagement_score(user_id, session)
    
    return {
        "user_id": user_id,
        "badge": badge_level,
        "total_xp": total_xp,
        "total_accepted_submissions": total_submissions,
        "events_attended": events_attended,
        "engagement_score": round(engagement_score, 2)
    }

@router.get("/me")
def get_my_badge(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Get current user's badge"""
    return get_user_badge(current_user.id, session)

