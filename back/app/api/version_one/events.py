"""Events: create, list, view, edit and delete; joining and leaving; members; AI writing helpers.

Chat lives in event_chat.py and the whiteboard in whiteboard.py.
"""
from datetime import datetime, timezone
import logging
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select, func

from app.api.version_one.auth import _get_user_from_token, _get_optional_user_from_token
from app.api.version_one.badges import award_xp_for_event
from app.core import rate_limit
from app.core.db import get_session
from app.models import Event, EventAttendee, User
from app.schemas.events import EventCreate, EventRead, EventUpdate
from app.services import chat_state
from app.services.ai import refine_text, generate_image
from app.services.cleanup import delete_event_data
from app.services.users import public_user
from app.services.event_queries import (
    as_utc, finish_status_filter, has_ended, has_started, is_member, member_counts, parse_status,
    prefilter_by_status, serialize_event, serialize_events, user_event_ids_query, without_materials,
)

router = APIRouter(prefix="/events", tags=["events"])
logger = logging.getLogger("peerprep.events")

# Each AI call costs money, so cap them per person
AI_CALLS_PER_HOUR = 20


def _get_event(session: Session, event_id: int) -> Event:
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    return evt


def _get_own_event(session: Session, event_id: int, user: User) -> Event:
    evt = _get_event(session, event_id)
    if evt.created_by != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return evt


# ---------- Create & list ----------

@router.post("", response_model=EventRead, status_code=201)
def create_event(data: EventCreate, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    evt = Event(**data.model_dump(), created_by=current_user.id)
    session.add(evt)
    session.commit()
    session.refresh(evt)
    # The creator is a member of their own event
    session.add(EventAttendee(event_id=evt.id, user_id=current_user.id))
    session.commit()
    session.refresh(evt)
    return serialize_event(session, evt, current_user)


@router.get("")
def list_events(
    session: Session = Depends(get_session),
    q: Optional[str] = None,
    location: Optional[str] = None,
    exam: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: str = Query("upcoming"),
    sort: Literal["newest", "soonest"] = "newest",
    current_user: Optional[User] = Depends(_get_optional_user_from_token),
):
    """Events matching the filters. `sort=soonest` orders upcoming/ongoing events by start time; past events
    are always most recent first."""
    status = parse_status(status)
    now = datetime.now(timezone.utc)

    query = without_materials(select(Event))
    if q:
        query = query.where(Event.title.ilike(f"%{q}%") | Event.description.ilike(f"%{q}%"))
    if location:
        query = query.where(Event.location.ilike(f"%{location}%"))
    if exam:
        query = query.where(Event.exam.ilike(f"%{exam}%"))
    query = prefilter_by_status(query, status, now)
    if status == "past":
        query = query.order_by(Event.starts_at.desc())
    elif sort == "soonest":
        query = query.order_by(Event.starts_at.asc(), Event.id.asc())
    else:
        query = query.order_by(Event.created_at.desc())

    # Ongoing/past are finished in Python, so over-fetch to still fill the page
    fetch_limit = limit * 2 if status in ("ongoing", "past") else limit
    events = session.exec(query.limit(fetch_limit).offset(offset)).all()
    events = finish_status_filter(events, status, now, limit)
    return serialize_events(session, events, current_user)


def _my_events(session: Session, user: User, status: str, now: datetime):
    query = prefilter_by_status(without_materials(user_event_ids_query(session, user)), status, now)
    return query.order_by(Event.starts_at.desc() if status == "past" else Event.starts_at.asc())


@router.get("/my-events/count")
def get_my_events_count(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
    status: str = Query("upcoming"),
):
    """How many events you created or attend (for the badge on the Events page)."""
    status = parse_status(status)
    now = datetime.now(timezone.utc)
    events = session.exec(_my_events(session, current_user, status, now)).all()
    return {"count": len(finish_status_filter(events, status, now, limit=len(events)))}


@router.get("/my-events", response_model=List[EventRead])
def get_my_events(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: str = Query("upcoming"),
):
    """Events you created or attend."""
    status = parse_status(status)
    now = datetime.now(timezone.utc)
    fetch_limit = limit * 2 if status in ("ongoing", "past") else limit
    events = session.exec(_my_events(session, current_user, status, now).limit(fetch_limit).offset(offset)).all()
    return serialize_events(session, finish_status_filter(events, status, now, limit), current_user)


@router.get("/autocomplete")
def autocomplete_events(
    q: str = Query("", min_length=1, max_length=200),
    limit: int = Query(8, le=20),
    session: Session = Depends(get_session),
):
    """Event titles matching what's typed in the Home search box."""
    rows = session.exec(
        select(Event.title, Event.id, Event.location).where(Event.title.ilike(f"%{q}%")).limit(limit)
    ).all()
    return [
        {"id": r.id, "title": r.title, "location": r.location, "full": f"{r.title} - {r.location}" if r.location else r.title}
        for r in rows
    ]


# ---------- Single event ----------

@router.get("/{event_id}", response_model=EventRead)
def get_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(_get_optional_user_from_token),
):
    evt = _get_event(session, event_id)
    if current_user and has_ended(evt) and is_member(session, evt, current_user):
        award_xp_for_event(current_user.id, event_id, session)
    return serialize_event(session, evt, current_user)


@router.patch("/{event_id}", response_model=EventRead)
def update_event(event_id: int, data: EventUpdate, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    evt = _get_own_event(session, event_id, current_user)

    updates = data.model_dump(exclude_unset=True)
    for field in ("title", "location", "starts_at", "capacity", "duration"):
        if field in updates and updates[field] is None:
            raise HTTPException(status_code=422, detail=f"{field.replace('_', ' ').capitalize()} cannot be empty")

    if "starts_at" in updates and as_utc(updates["starts_at"]) != as_utc(evt.starts_at):
        if as_utc(updates["starts_at"]) <= datetime.now(timezone.utc):
            raise HTTPException(status_code=422, detail="Start time must be in the future")

    if "capacity" in updates:
        members = member_counts(session, [evt])[evt.id]
        if updates["capacity"] < members:
            raise HTTPException(
                status_code=400,
                detail=f"Capacity can't be lower than the number of people already attending ({members})",
            )

    for key, value in updates.items():
        setattr(evt, key, value)
    session.add(evt)
    session.commit()
    session.refresh(evt)
    return serialize_event(session, evt, current_user)


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    evt = _get_own_event(session, event_id, current_user)
    delete_event_data(session, event_id)
    session.delete(evt)
    session.commit()
    return None


# ---------- Membership ----------

@router.post("/{event_id}/join")
def join_event(event_id: int, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    evt = _get_event(session, event_id)
    if has_started(evt):
        raise HTTPException(status_code=400, detail="Event has already started")

    count = member_counts(session, [evt])[evt.id]
    if is_member(session, evt, current_user):
        return {"success": True, "alreadyJoined": True, "attendee_count": count}
    if evt.capacity and count >= evt.capacity:
        raise HTTPException(status_code=409, detail="Event is full")

    session.add(EventAttendee(event_id=event_id, user_id=current_user.id))
    session.commit()
    chat_state.touch_presence(current_user.id)
    return {"success": True, "attendee_count": member_counts(session, [evt])[evt.id]}


@router.delete("/{event_id}/join")
def leave_event(event_id: int, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    evt = _get_event(session, event_id)
    if has_started(evt):
        raise HTTPException(status_code=400, detail="You cannot leave an event that has already started")

    record = session.exec(
        select(EventAttendee).where(EventAttendee.event_id == event_id, EventAttendee.user_id == current_user.id)
    ).first()
    if not record:
        return {"success": True, "notJoined": True, "attendee_count": member_counts(session, [evt])[evt.id]}

    session.delete(record)
    session.commit()
    return {"success": True, "attendee_count": member_counts(session, [evt])[evt.id]}


@router.get("/{event_id}/attendees", response_model=List[int])
def list_attendees(event_id: int, session: Session = Depends(get_session)):
    """Member user ids, including the creator."""
    evt = _get_event(session, event_id)
    user_ids = list(session.exec(select(EventAttendee.user_id).where(EventAttendee.event_id == event_id)).all())
    if evt.created_by not in user_ids:
        user_ids.append(evt.created_by)
    return user_ids


@router.get("/{event_id}/attendees/details")
def list_attendees_with_details(event_id: int, session: Session = Depends(get_session)):
    """Members with their profiles, in the order they joined (creator included)."""
    evt = _get_event(session, event_id)
    records = session.exec(
        select(EventAttendee).where(EventAttendee.event_id == event_id).order_by(EventAttendee.joined_at.asc())
    ).all()
    joined_at = {r.user_id: r.joined_at for r in records}
    joined_at.setdefault(evt.created_by, evt.starts_at)

    users = {u.id: u for u in session.exec(select(User).where(User.id.in_(list(joined_at)))).all()}
    members = [
        {**public_user(u), "joined_at": joined_at[u.id].isoformat()}
        for uid in joined_at if (u := users.get(uid))
    ]
    return sorted(members, key=lambda m: m["joined_at"])


# ---------- AI helpers ----------

class TextRefinementRequest(BaseModel):
    text: str = Field(max_length=5000)
    field_type: Literal["title", "description", "general"] = "general"


def _ai_unavailable(action: str, error: Exception) -> HTTPException:
    # The provider's error text can include account details, so it stays in the server log
    logger.warning("AI %s failed: %r", action, error.__cause__ or error)
    if isinstance(error.__cause__ or error, ValueError):  # no API key configured
        return HTTPException(status_code=503, detail="AI help isn't available right now.")
    return HTTPException(status_code=502, detail=f"Couldn't {action} right now. Please try again.")


@router.post("/refine-text")
async def refine_event_text(request: TextRefinementRequest, current_user: User = Depends(_get_user_from_token)):
    """Polish a title or description the user wrote."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    rate_limit.hit(f"ai:user:{current_user.id}", AI_CALLS_PER_HOUR, 3600)
    try:
        refined = await refine_text(text=request.text.strip(), context=None, field_type=request.field_type)
    except Exception as e:
        raise _ai_unavailable("improve the text", e)
    return {"refined_text": refined}


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(max_length=1000)


@router.post("/generate-image")
async def generate_cover_image(request: ImageGenerationRequest, current_user: User = Depends(_get_user_from_token)):
    """Generate a cover image from a prompt; returns a base64 data URL."""
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    rate_limit.hit(f"ai:user:{current_user.id}", AI_CALLS_PER_HOUR, 3600)
    try:
        return {"image_url": await generate_image(request.prompt.strip())}
    except Exception as e:
        raise _ai_unavailable("generate an image", e)
