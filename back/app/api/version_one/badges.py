"""Event-only Badge & XP API

- XP from attending events
- Engagement score based only on events
- Badges based on XP + events attended + weekly streak + engagement
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func

from app.core.db import get_session
from app.models import User, EventAttendee, Event
from app.api.version_one.auth import _get_user_from_token

from app.services.gamification import (
    BadgeSystem,
    EngagementPredictor,
    award_event_xp,
    award_xp_for_all_past_events,
)

router = APIRouter(prefix="/badges", tags=["badges"])



def award_xp_for_event(user_id: int, event_id: int, session: Session) -> int:
    """
    Award dynamically calculated XP when user attends an event
    (only if the event has already started).
    """
    return award_event_xp(user_id, event_id, session)


def get_user_badge_level(user_id: int, session: Session) -> Optional[dict]:
    """Calculate user's badge level using event-only BadgeSystem."""
    return BadgeSystem.get_user_badge(user_id, session)


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

    # Count only events that have ENDED (past events), not ongoing events
    # This matches the "My Past Events" filter logic
    # Include both events user is attending AND events user created (creators are auto-attendees)
    
    # Get events from EventAttendee table
    attendee_events = session.exec(
        select(Event)
        .join(EventAttendee, Event.id == EventAttendee.event_id)
        .where(EventAttendee.user_id == user_id)
    ).all()
    
    # Get events user created (creators are auto-attendees)
    created_events = session.exec(
        select(Event)
        .where(Event.created_by == user_id)
    ).all()
    
    # Combine and deduplicate
    all_event_ids = set()
    for event in attendee_events:
        all_event_ids.add(event.id)
    for event in created_events:
        all_event_ids.add(event.id)
    
    # Filter in Python to check ends_at accurately
    past_events_count = 0
    for event_id in all_event_ids:
        event = session.get(Event, event_id)
        if event:
            starts_at = event.starts_at
            if starts_at.tzinfo is None:
                starts_at = starts_at.replace(tzinfo=timezone.utc)
            ends_at = starts_at + timedelta(hours=event.duration)
            if ends_at <= now:
                past_events_count += 1
    
    events_attended = past_events_count

    engagement_score = EngagementPredictor.calculate_engagement_score(
        user_id, session
    )
    
    from app.services.gamification import calculate_weekly_streak
    weekly_streak = calculate_weekly_streak(user_id, session)

    return {
        "user_id": user_id,
        "badge": badge_level,
        "total_xp": total_xp,
        # missions are removed → keep field for frontend compatibility
        "total_accepted_submissions": 0,
        "events_attended": events_attended,
        "engagement_score": round(engagement_score, 2),
        "weekly_streak": weekly_streak,
    }


@router.get("/me")
def get_my_badge(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
):
    """Get current user's badge + stats."""
    return get_user_badge(current_user.id, session)


@router.post("/me/award-past-events")
def award_past_events_xp(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
):
    """
    Award XP for all past events that the user attended but hasn't received XP for yet.
    This is useful for retroactively awarding XP for events that ended before the XP system was implemented,
    or for events that the user hasn't visited yet.
    """
    result = award_xp_for_all_past_events(current_user.id, session)
    return {
        "success": True,
        "message": f"Awarded {result['total_xp_awarded']} XP for {result['events_processed']} past events",
        **result
    }
