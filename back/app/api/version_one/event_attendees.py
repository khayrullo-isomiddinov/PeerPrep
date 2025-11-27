from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from app.core.db import get_session
from app.models import Event, User, EventAttendee
from datetime import datetime, timezone, timedelta
from app.api.version_one.auth import _get_user_from_token
from app.api.version_one.badges import award_xp_for_event

router = APIRouter(prefix="/events/{event_id}/attendees", tags=["events"])

@router.post("/join")
def join_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    now_utc = datetime.now(timezone.utc)
    starts_at = evt.starts_at.replace(tzinfo=timezone.utc) if evt.starts_at.tzinfo is None else evt.starts_at
    ends_at = starts_at + timedelta(hours=evt.duration)

    if starts_at <= now_utc:
        raise HTTPException(status_code=400, detail="Event has already started")

    already = session.exec(
        select(EventAttendee)
        .where(EventAttendee.event_id == event_id, EventAttendee.user_id == current_user.id)
    ).first()

    attendee_count = session.exec(
        select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)
    ).one()

    
    creator_in_attendee = session.exec(
        select(EventAttendee)
        .where(EventAttendee.event_id == event_id, EventAttendee.user_id == evt.created_by)
    ).first()
    if not creator_in_attendee:
        attendee_count += 1

    if already:
        return {"success": True, "alreadyJoined": True, "attendee_count": attendee_count}

    if evt.capacity and attendee_count >= evt.capacity:
        raise HTTPException(status_code=409, detail="Event is full")

    session.add(EventAttendee(event_id=event_id, user_id=current_user.id))
    session.commit()

    attendee_count = session.exec(
        select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)
    ).one()
    if not creator_in_attendee:
        attendee_count += 1

    if now_utc >= ends_at:
        award_xp_for_event(current_user.id, event_id, session)

    return {"success": True, "attendee_count": attendee_count}

@router.delete("/leave")
def leave_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    now_utc = datetime.now(timezone.utc)
    starts_at = evt.starts_at.replace(tzinfo=timezone.utc) if evt.starts_at.tzinfo is None else evt.starts_at

    if now_utc >= starts_at:
        raise HTTPException(
            status_code=400,
            detail="You cannot leave an event that has already started"
        )

    rec = session.exec(
        select(EventAttendee)
        .where(EventAttendee.event_id == event_id, EventAttendee.user_id == current_user.id)
    ).first()

    def get_attendee_count():
        base = session.exec(
            select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)
        ).one()

        creator_in_attendee = session.exec(
            select(EventAttendee)
            .where(EventAttendee.event_id == event_id, EventAttendee.user_id == evt.created_by)
        ).first()

        if not creator_in_attendee:
            base += 1

        return base

    if not rec:
        return {"success": True, "notJoined": True, "attendee_count": get_attendee_count()}

    session.delete(rec)
    session.commit()

    return {"success": True, "attendee_count": get_attendee_count()}

@router.get("", response_model=List[int])
def list_attendees(event_id: int, session: Session = Depends(get_session)):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    
    user_ids = session.exec(
        select(EventAttendee.user_id).where(EventAttendee.event_id == event_id)
    ).all()

    user_ids = [uid for uid in user_ids]

    
    if evt.created_by not in user_ids:
        user_ids.append(evt.created_by)

    return user_ids


@router.get("/details")
def list_attendees_with_details(event_id: int, session: Session = Depends(get_session)):
    """Get full attendee list with user details, including owner."""
    
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    
    attendee_records = session.exec(
        select(EventAttendee)
        .where(EventAttendee.event_id == event_id)
        .order_by(EventAttendee.joined_at.asc())
    ).all()

    
    joined_times = {a.user_id: a.joined_at for a in attendee_records}

    
    if evt.created_by not in joined_times:
        
        joined_times[evt.created_by] = evt.starts_at

    user_ids = list(joined_times.keys())

    
    users = session.exec(select(User).where(User.id.in_(user_ids))).all()
    user_map = {u.id: u for u in users}

    
    result = []
    for user_id in user_ids:
        u = user_map.get(user_id)
        if u:
            result.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "photo_url": u.photo_url,
                "is_verified": u.is_verified,
                "joined_at": joined_times[user_id].isoformat()
            })

    
    result.sort(key=lambda x: x["joined_at"])

    return result
