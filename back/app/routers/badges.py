"""Event-only Badge & XP API

- XP from attending events
- Engagement score based only on events
- Badges based on XP + events attended + weekly streak + engagement
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func

from app.db import get_session
from app.models import User, EventAttendee, Event
from app.routers.auth import _get_user_from_token
from app.services.gamification import (
    BadgeSystem,
    EngagementPredictor,
    award_event_xp,
)

router = APIRouter(prefix="/badges", tags=["badges"])


# ----------------------------------------------------
# XP helpers
# ----------------------------------------------------

def award_xp_for_event(user_id: int, event_id: int, session: Session) -> int:
    """
    Award dynamically calculated XP when user attends an event
    (only if the event has already started).
    """
    return award_event_xp(user_id, event_id, session)


def get_user_badge_level(user_id: int, session: Session) -> Optional[dict]:
    """Calculate user's badge level using event-only BadgeSystem."""
    return BadgeSystem.get_user_badge(user_id, session)


# ----------------------------------------------------
# Routes
# ----------------------------------------------------

@router.get("/user/{user_id}")
def get_user_badge(
    user_id: int,
    session: Session = Depends(get_session),
):
    """
    Get badge + gamification stats for a specific user.

    Response shape is kept compatible with the frontend:
    - user_id
    - badge: { name, min_xp, requirements, icon, color }
    - total_xp
    - total_accepted_submissions (always 0 now, missions removed)
    - events_attended
    - engagement_score
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    badge_level = get_user_badge_level(user_id, session)
    total_xp = user.xp or 0

    now = datetime.now(timezone.utc)

    events_attended = (
        session.exec(
            select(func.count(EventAttendee.id))
            .join(Event, Event.id == EventAttendee.event_id)
            .where(
                EventAttendee.user_id == user_id,
                Event.starts_at <= now,
            )
        ).one()
        or 0
    )

    engagement_score = EngagementPredictor.calculate_engagement_score(
        user_id, session
    )

    return {
        "user_id": user_id,
        "badge": badge_level,
        "total_xp": total_xp,
        # missions are removed → keep field for frontend compatibility
        "total_accepted_submissions": 0,
        "events_attended": events_attended,
        "engagement_score": round(engagement_score, 2),
    }


@router.get("/me")
def get_my_badge(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
):
    """Get current user's badge + stats."""
    return get_user_badge(current_user.id, session)
