from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from app.db import get_session
from app.models import Event, User, EventAttendee
from app.schemas.events import EventCreate, EventRead, EventUpdate
from app.routers.auth import _get_user_from_token

router = APIRouter(prefix="/events", tags=["events"])

@router.post("", response_model=EventRead, status_code=201)
def create_event(data: EventCreate, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    if data.capacity is not None and data.capacity < 1:
        raise HTTPException(status_code=422, detail="Capacity must be >= 1")
    evt = Event(**data.dict(), created_by=current_user.id)
    session.add(evt)
    session.commit()
    session.refresh(evt)
    session.add(EventAttendee(event_id=evt.id, user_id=current_user.id))
    session.commit()
    session.refresh(evt)
    return evt


@router.get("", response_model=List[EventRead])
def list_events(
    session: Session = Depends(get_session),
    kind: Optional[str] = None,
    group_id: Optional[int] = None,
    q: Optional[str] = None,
    location: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    query = select(Event)
    if kind:
        query = query.where(Event.kind == kind)
    if group_id is not None:
        query = query.where(Event.group_id == group_id)
    if q:
        like = f"%{q}%"
        query = query.where((Event.title.ilike(like)) | (Event.description.ilike(like)))
    if location:
        like_loc = f"%{location}%"
        query = query.where(Event.location.ilike(like_loc))
    query = query.order_by(Event.starts_at).limit(limit).offset(offset)
    return session.exec(query).all()

@router.get("/autocomplete")
def autocomplete_events(
    q: str = Query("", min_length=1),
    limit: int = Query(8, le=20),
    session: Session = Depends(get_session)
):
    """Autocomplete events by title"""
    query = select(Event.title, Event.id, Event.location).where(
        Event.title.ilike(f"%{q}%")
    ).limit(limit)
    
    events = session.exec(query).all()
    return [
        {
            "id": event.id,
            "title": event.title,
            "location": event.location,
            "full": f"{event.title} - {event.location}" if event.location else event.title
        }
        for event in events
    ]

@router.get("/{event_id}", response_model=EventRead)
def get_event(event_id: int, session: Session = Depends(get_session)):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    return evt

@router.patch("/{event_id}", response_model=EventRead)
def update_event(event_id: int, data: EventUpdate, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    if evt.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    updates = data.dict(exclude_unset=True)
    for k, v in updates.items():
        setattr(evt, k, v)
    if getattr(evt, "capacity", 1) < 1:
        raise HTTPException(status_code=422, detail="Capacity must be >= 1")
    session.add(evt)
    session.commit()
    session.refresh(evt)
    return evt

@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    if evt.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    rows = session.exec(select(EventAttendee).where(EventAttendee.event_id == event_id)).all()
    for r in rows:
        session.delete(r)
    session.delete(evt)
    session.commit()
    return None

@router.post("/{event_id}/join", status_code=204)
def join_event(event_id: int, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    exists = session.exec(select(EventAttendee).where(EventAttendee.event_id == event_id, EventAttendee.user_id == current_user.id)).first()
    if exists:
        raise HTTPException(status_code=409, detail="Already joined")
    count = session.exec(select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)).one()
    if count >= evt.capacity:
        raise HTTPException(status_code=409, detail="Event is full")
    rec = EventAttendee(event_id=event_id, user_id=current_user.id)
    session.add(rec)
    session.commit()
    return None

@router.delete("/{event_id}/join", status_code=204)
def leave_event(event_id: int, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    rec = session.exec(select(EventAttendee).where(EventAttendee.event_id == event_id, EventAttendee.user_id == current_user.id)).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not joined")
    session.delete(rec)
    session.commit()
    return None

@router.get("/{event_id}/attendees", response_model=List[int])
def list_attendees(event_id: int, session: Session = Depends(get_session)):
    session.get(Event, event_id) or (_ for _ in ()).throw(HTTPException(status_code=404, detail="Event not found"))
    rows = session.exec(select(EventAttendee.user_id).where(EventAttendee.event_id == event_id)).all()
    return [r for r in rows]