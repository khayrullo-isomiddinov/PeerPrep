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
from app.config import settings


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
    for (starts_at,) in rows:
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
        recent_start = now - timedelta(days=14)
        recent_count = session.exec(
            select(func.count(EventAttendee.id))
            .join(Event, Event.id == EventAttendee.event_id)
            .where(
                EventAttendee.user_id == user_id,
                Event.starts_at.between(recent_start, now),
            )
        ).one() or 0
        recency_score = min(1.0, recent_count / 4.0)

        # --- Frequency (lifetime) ---
        user = session.get(User, user_id)
        if user and user.created_at:
            created_at = _to_utc(user.created_at)
            age_days = max(1, (now - created_at).days)
            age_weeks = age_days / 7

            total_events = session.exec(
                select(func.count(EventAttendee.id))
                .where(EventAttendee.user_id == user_id)
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
    """Give XP only if event has already started."""
    event = session.get(Event, event_id)
    if not event:
        return 0

    now = datetime.now(timezone.utc)
    if _to_utc(event.starts_at) > now:
        return 0  # future event = cannot award XP

    xp = XPCalculator.event_xp(user_id, event_id, session)

    user = session.get(User, user_id)
    if not user:
        return 0

    user.xp = (user.xp or 0) + xp
    session.add(user)
    session.commit()

    return xp


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

        events_attended = session.exec(
            select(func.count(EventAttendee.id))
            .join(Event, Event.id == EventAttendee.event_id)
            .where(EventAttendee.user_id == user_id, Event.starts_at <= now)
        ).one() or 0

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
