"""Shared event logic: lifecycle status, member counts and API serialization.

Every endpoint that returns events goes through `serialize_events`, so status fields and
counts are computed one way everywhere.
"""
import json
from collections import Counter
from datetime import datetime, timezone, timedelta
from typing import Iterable, Optional

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import defer
from sqlmodel import Session, select

from app.models import Event, EventAttendee, User

STATUS_FILTERS = {"upcoming", "ongoing", "past", "all"}


def as_utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def event_window(evt: Event) -> tuple[datetime, datetime]:
    starts_at = as_utc(evt.starts_at)
    return starts_at, starts_at + timedelta(hours=evt.duration)


def event_status_fields(evt: Event, now: Optional[datetime] = None) -> dict:
    now = now or datetime.now(timezone.utc)
    starts_at, ends_at = event_window(evt)
    is_upcoming = now < starts_at
    is_past = now >= ends_at
    is_ongoing = not is_upcoming and not is_past
    return {
        "ends_at": ends_at,
        "is_upcoming": is_upcoming,
        "is_ongoing": is_ongoing,
        "is_past": is_past,
        "status": "ongoing" if is_ongoing else "past" if is_past else "upcoming",
    }


def has_started(evt: Event, now: Optional[datetime] = None) -> bool:
    return (now or datetime.now(timezone.utc)) >= as_utc(evt.starts_at)


def has_ended(evt: Event, now: Optional[datetime] = None) -> bool:
    return (now or datetime.now(timezone.utc)) >= event_window(evt)[1]


def parse_status(status: Optional[str]) -> str:
    status = (status or "upcoming").lower()
    if status not in STATUS_FILTERS:
        raise HTTPException(status_code=400, detail="Invalid status filter")
    return status


def prefilter_by_status(query, status: str, now: datetime):
    """Coarse SQL filter on start time; `matches_status` finishes the job in Python, because an
    event's end (start + duration) can't be compared portably across SQLite and Postgres."""
    now_naive = now.replace(tzinfo=None)
    if status == "upcoming":
        return query.where(Event.starts_at > now_naive)
    if status in ("ongoing", "past"):
        return query.where(Event.starts_at <= now_naive)
    return query


def matches_status(evt: Event, status: str, now: datetime) -> bool:
    if status == "all":
        return True
    return event_status_fields(evt, now)["status"] == status


def finish_status_filter(events: Iterable[Event], status: str, now: datetime, limit: int) -> list[Event]:
    return [e for e in events if matches_status(e, status, now)][:limit]


def member_counts(session: Session, events: list[Event]) -> dict[int, int]:
    """Members per event: attendee rows, plus the creator if they aren't stored as an attendee
    (older events were created before creators were auto-added)."""
    ids = [e.id for e in events]
    if not ids:
        return {}
    rows = session.exec(select(EventAttendee.event_id, EventAttendee.user_id).where(EventAttendee.event_id.in_(ids))).all()
    counts = Counter(event_id for event_id, _ in rows)
    attending = set(rows)
    return {
        e.id: counts[e.id] + (1 if e.created_by and (e.id, e.created_by) not in attending else 0)
        for e in events
    }


def joined_event_ids(session: Session, events: list[Event], user: User) -> set[int]:
    ids = [e.id for e in events]
    if not ids:
        return set()
    joined = set(session.exec(
        select(EventAttendee.event_id).where(EventAttendee.event_id.in_(ids), EventAttendee.user_id == user.id)
    ).all())
    return joined | {e.id for e in events if e.created_by == user.id}


def without_materials(query):
    """Skip loading study materials (base64 files, up to ~30 MB per event) for list queries."""
    return query.options(defer(Event.study_materials))


def materials_count(raw: Optional[str]) -> int:
    try:
        parsed = json.loads(raw) if raw else []
    except ValueError:
        return 0
    return len(parsed) if isinstance(parsed, list) else 0


def serialize_events(session: Session, events: list[Event], user: Optional[User] = None, *, with_materials: bool = False) -> list[dict]:
    """API representation of events, with status fields, member counts and (if signed in) is_joined.

    Study materials are for members only. Lists never include them (they're large and lists are public);
    single-event responses include them, and their count, when `with_materials` is set and the user is a member.
    """
    now = datetime.now(timezone.utc)
    counts = member_counts(session, events)
    joined = joined_event_ids(session, events, user) if user else None
    result = []
    for evt in events:
        data = evt.model_dump(exclude={"study_materials"})
        data.update(event_status_fields(evt, now))
        data["attendee_count"] = counts.get(evt.id, 0)
        data["study_materials"] = None
        data["materials_count"] = None
        if with_materials:
            data["materials_count"] = materials_count(evt.study_materials)
            if joined is not None and evt.id in joined:
                data["study_materials"] = evt.study_materials
        if joined is not None:
            data["is_joined"] = evt.id in joined
        result.append(data)
    return result


def serialize_event(session: Session, evt: Event, user: Optional[User] = None) -> dict:
    return serialize_events(session, [evt], user, with_materials=True)[0]


def is_member(session: Session, evt: Event, user: User) -> bool:
    if evt.created_by == user.id:
        return True
    return session.exec(
        select(EventAttendee).where(EventAttendee.event_id == evt.id, EventAttendee.user_id == user.id)
    ).first() is not None


def user_event_ids_query(session: Session, user: User):
    """Base query for events the user created or attends."""
    attended = session.exec(select(EventAttendee.event_id).where(EventAttendee.user_id == user.id)).all()
    condition = Event.created_by == user.id
    if attended:
        condition = or_(condition, Event.id.in_(attended))
    return select(Event).where(condition)
