"""
EVENT-ONLY GAMIFICATION ENGINE

- XP from attending events
- Weekly streak based ONLY on events
- Engagement score based ONLY on events
- Badges based on XP + events attended + weekly streak + engagement
"""

from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from sqlmodel import Session, select, func

from app.models import User, Event, EventAttendee
from app.core.config import settings


# ----------------------------------------------------
# Helpers
# ----------------------------------------------------

def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


# ----------------------------------------------------
# Weekly Streak
# ----------------------------------------------------

def calculate_weekly_streak(user_id: int, session: Session, max_weeks_back: int = 52) -> int:
    """How many consecutive ISO weeks (backwards) contain ≥1 attended event."""
    now = datetime.now(timezone.utc)

    rows = session.exec(
        select(Event.starts_at)
        .join(EventAttendee, Event.id == EventAttendee.event_id)
        .where(EventAttendee.user_id == user_id, Event.starts_at <= now)
    ).all()

    if not rows:
        return 0

    # Build set of year-week keys
    week_keys = set()
    for starts_at in rows:
        dt = _to_utc(starts_at)
        iso_year, iso_week, _ = dt.isocalendar()
        week_keys.add((iso_year, iso_week))

    if not week_keys:
        return 0

    encoded = sorted({year * 60 + week for (year, week) in week_keys})

    streak = 1
    last = encoded[-1]

    for k in reversed(encoded[:-1]):
        if last - k == 1:
            streak += 1
            last = k
            if streak >= max_weeks_back:
                break
        else:
            break

    return streak


# ----------------------------------------------------
# Engagement Score
# ----------------------------------------------------

class EngagementPredictor:
    """
    ML-inspired event-based engagement score ∈ [0,1]:

    recency    = events in last 14 days
    frequency  = events/week over lifetime
    consistency = weekly streak
    """

    @staticmethod
    def calculate_engagement_score(user_id: int, session: Session) -> float:
        now = datetime.now(timezone.utc)

        # --- Recency (last 14 days) ---
        # Only count events that have ALREADY STARTED (not future events)
        recent_start = now - timedelta(days=14)
        recent_count = session.exec(
            select(func.count(EventAttendee.id))
            .join(Event, Event.id == EventAttendee.event_id)
            .where(
                EventAttendee.user_id == user_id,
                Event.starts_at <= now,  # Only events that have started
                Event.starts_at >= recent_start,  # In the last 14 days
            )
        ).one() or 0
        recency_score = min(1.0, recent_count / 4.0)

        # --- Frequency (lifetime) ---
        user = session.get(User, user_id)
        if user and user.created_at:
            created_at = _to_utc(user.created_at)
            age_days = max(1, (now - created_at).days)
            age_weeks = age_days / 7

            # Only count events that have ALREADY STARTED (not future events)
            total_events = session.exec(
                select(func.count(EventAttendee.id))
                .join(Event, Event.id == EventAttendee.event_id)
                .where(
                    EventAttendee.user_id == user_id,
                    Event.starts_at <= now,  # Only events that have started
                )
            ).one() or 0

            events_per_week = total_events / max(1.0, age_weeks)
            frequency_score = min(1.0, events_per_week / 2.0)  # 2/week = full
        else:
            frequency_score = 0.0

        # --- Consistency ---
        streak = calculate_weekly_streak(user_id, session)
        consistency_score = min(1.0, streak / 8.0)

        engagement = 0.4 * recency_score + 0.3 * frequency_score + 0.3 * consistency_score
        return max(0.0, min(1.0, engagement))


# ----------------------------------------------------
# XP Engine
# ----------------------------------------------------

class XPCalculator:
    BASE_EVENT_XP = 30

    @staticmethod
    def event_xp(user_id: int, event_id: int, session: Session) -> int:
        base = XPCalculator.BASE_EVENT_XP
        engagement = EngagementPredictor.calculate_engagement_score(user_id, session)
        streak = calculate_weekly_streak(user_id, session)

        xp = int(
            base
            * (1.0 + engagement * 0.15)     # up to +15%
            * (1.0 + streak * 0.05)         # +5% per streak week
        )

        return max(base, xp)


def award_event_xp(user_id: int, event_id: int, session: Session) -> int:
    """
    Award XP for attending an event.
    Only awards if:
    - Event has ENDED (not just started)
    - User is an attendee or creator
    - XP hasn't been awarded yet (duplicate prevention)
    """
    event = session.get(Event, event_id)
    if not event:
        return 0

    now = datetime.now(timezone.utc)
    starts_at = _to_utc(event.starts_at)
    ends_at = starts_at + timedelta(hours=event.duration)
    
    # Cannot award XP for events that haven't ended yet
    if ends_at > now:
        return 0

    # Check if user is an attendee or creator
    is_attendee = session.exec(
        select(EventAttendee).where(
            EventAttendee.event_id == event_id,
            EventAttendee.user_id == user_id
        )
    ).first()
    
    is_creator = event.created_by == user_id
    
    if not is_attendee and not is_creator:
        return 0  # User didn't attend this event

    # Check if XP was already awarded (duplicate prevention)
    if is_attendee and is_attendee.xp_awarded:
        return 0  # Already awarded
    
    # For creators, check if they're in attendee table and if XP was awarded
    if is_creator and not is_attendee:
        # Creator is auto-attendee, but not in EventAttendee table
        # We'll award XP and mark it in a new EventAttendee record
        pass
    elif is_creator and is_attendee and is_attendee.xp_awarded:
        return 0  # Already awarded

    # Calculate and award XP
    xp = XPCalculator.event_xp(user_id, event_id, session)

    user = session.get(User, user_id)
    if not user:
        return 0

    user.xp = (user.xp or 0) + xp
    session.add(user)
    
    # Mark XP as awarded
    if is_attendee:
        is_attendee.xp_awarded = True
        session.add(is_attendee)
    else:
        # Creator not in attendee table - create record to track XP
        attendee = EventAttendee(
            event_id=event_id,
            user_id=user_id,
            xp_awarded=True
        )
        session.add(attendee)
    
    session.commit()

    return xp


def award_xp_for_all_past_events(user_id: int, session: Session) -> Dict[str, int]:
    """
    Award XP for all past events that the user attended but hasn't received XP for yet.
    Returns a summary of how many events were processed and total XP awarded.
    """
    now = datetime.now(timezone.utc)
    
    # Get all events where user is an attendee and XP hasn't been awarded
    # We'll filter by ends_at in Python for accuracy
    attendee_events = session.exec(
        select(Event, EventAttendee)
        .join(EventAttendee, Event.id == EventAttendee.event_id)
        .where(
            EventAttendee.user_id == user_id,
            Event.starts_at <= now,  # Basic filter, will refine in Python
            EventAttendee.xp_awarded == False
        )
    ).all()
    
    # Filter to only events that have ENDED
    past_attendee_events = []
    for event, attendee in attendee_events:
        starts_at = _to_utc(event.starts_at)
        ends_at = starts_at + timedelta(hours=event.duration)
        if ends_at <= now:
            past_attendee_events.append((event, attendee))
    
    # Get all events where user is creator but not in EventAttendee table
    # (for old events created before we started tracking creators)
    creator_events = session.exec(
        select(Event)
        .where(
            Event.created_by == user_id,
            Event.starts_at <= now  # Basic filter, will refine in Python
        )
    ).all()
    
    # Filter to only events that have ENDED
    past_creator_events = []
    for event in creator_events:
        starts_at = _to_utc(event.starts_at)
        ends_at = starts_at + timedelta(hours=event.duration)
        if ends_at <= now:
            past_creator_events.append(event)
    
    # Filter out creator events that are already in EventAttendee
    creator_event_ids = {e.id for e in past_creator_events}
    attendee_event_ids = {e.id for e, _ in past_attendee_events}
    creator_only_events = [e for e in past_creator_events if e.id not in attendee_event_ids]
    
    total_xp_awarded = 0
    events_processed = 0
    
    # Award XP for attendee events
    for event, attendee in past_attendee_events:
        xp = award_event_xp(user_id, event.id, session)
        if xp > 0:
            total_xp_awarded += xp
            events_processed += 1
    
    # Award XP for creator-only events (will create EventAttendee record)
    for event in creator_only_events:
        xp = award_event_xp(user_id, event.id, session)
        if xp > 0:
            total_xp_awarded += xp
            events_processed += 1
    
    return {
        "events_processed": events_processed,
        "total_xp_awarded": total_xp_awarded
    }


# ----------------------------------------------------
# Badge System
# ----------------------------------------------------

class BadgeSystem:
    """Awards one of 5 badges based ONLY on event statistics."""

    BADGES = [
        {
            "name": "Beginner",
            "min_xp": 0,
            "requirements": {"xp": 0},
            "icon": "🌱",
            "color": "green",
        },
        {
            "name": "Learner",
            "min_xp": 200,
            "requirements": {
                "xp": 200,
                "events": 2,
                "weekly_streak": 1,
                "engagement": 0.2,
            },
            "icon": "📚",
            "color": "blue",
        },
        {
            "name": "Achiever",
            "min_xp": 500,
            "requirements": {
                "xp": 500,
                "events": 5,
                "weekly_streak": 3,
                "engagement": 0.4,
            },
            "icon": "⭐",
            "color": "purple",
        },
        {
            "name": "Expert",
            "min_xp": 1500,
            "requirements": {
                "xp": 1500,
                "events": 15,
                "weekly_streak": 8,
                "engagement": 0.6,
            },
            "icon": "🏆",
            "color": "orange",
        },
        {
            "name": "Master",
            "min_xp": 4000,
            "requirements": {
                "xp": 4000,
                "events": 40,
                "weekly_streak": 16,
                "engagement": 0.8,
            },
            "icon": "👑",
            "color": "gold",
        },
    ]

    @staticmethod
    def _stats(user_id: int, session: Session) -> Dict:
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
                starts_at = _to_utc(event.starts_at)
                ends_at = starts_at + timedelta(hours=event.duration)
                if ends_at <= now:
                    past_events_count += 1
        
        events_attended = past_events_count

        weekly_streak = calculate_weekly_streak(user_id, session)
        engagement = EngagementPredictor.calculate_engagement_score(user_id, session)

        return {
            "events_attended": events_attended,
            "weekly_streak": weekly_streak,
            "engagement": engagement,
        }

    @staticmethod
    def get_user_badge(user_id: int, session: Session) -> Dict:
        user = session.get(User, user_id)
        if not user:
            return BadgeSystem.BADGES[0]

        # Admin gets Master automatically
        if user.email == settings.ADMIN_EMAIL:
            return BadgeSystem.BADGES[-1]

        stats = BadgeSystem._stats(user_id, session)
        total_xp = user.xp or 0

        # Check highest badge first
        for badge in reversed(BadgeSystem.BADGES):
            req = badge["requirements"]

            if total_xp < req.get("xp", 0):
                continue
            if stats["events_attended"] < req.get("events", 0):
                continue
            if stats["weekly_streak"] < req.get("weekly_streak", 0):
                continue
            if stats["engagement"] < req.get("engagement", 0.0):
                continue

            return badge

        return BadgeSystem.BADGES[0]
