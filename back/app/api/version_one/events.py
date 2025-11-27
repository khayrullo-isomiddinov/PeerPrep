from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Header, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select, func
from app.core.db import get_session
from app.models import Event, User, EventAttendee, EventMessage, MessageRead

from datetime import datetime, timezone, timedelta
from app.schemas.events import EventCreate, EventRead, EventUpdate
from app.api.version_one.auth import _get_user_from_token, _get_optional_user_from_token

from app.api.version_one.badges import award_xp_for_event
from app.services.ai import refine_text, generate_image
from app.services.message_sync import MessageVersion, get_synchronizer

from pydantic import BaseModel
from datetime import datetime, timezone

from collections import defaultdict, Counter
from zoneinfo import ZoneInfo




router = APIRouter(prefix="/events", tags=["events"])

# In-memory storage for typing indicators (event_id -> {user_id: last_typing_timestamp})
# In production, use Redis or similar for distributed systems
typing_status: Dict[int, Dict[int, datetime]] = defaultdict(dict)

# In-memory storage for user presence (user_id -> last_activity_timestamp)
# Users are considered "online" if they've been active in the last 5 minutes
user_presence: Dict[int, datetime] = {}
PRESENCE_TIMEOUT_SECONDS = 300  # 5 minutes

# WebSocket connections for event chat (event_id -> {user_id: WebSocket})
event_connections: Dict[int, Dict[int, WebSocket]] = {}

# Store reference to the main event loop for broadcasting from sync endpoints
_main_event_loop = None

def set_main_event_loop(loop):
    """Set the main event loop reference"""
    global _main_event_loop
    _main_event_loop = loop

@router.post("", response_model=EventRead, status_code=201)
def create_event(data: EventCreate, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    if data.capacity is not None and data.capacity < 1:
        raise HTTPException(status_code=422, detail="Capacity must be >= 1")
    payload = data.dict()

    evt = Event(**payload, created_by=current_user.id)
    session.add(evt)
    session.commit()
    session.refresh(evt)
    session.add(EventAttendee(event_id=evt.id, user_id=current_user.id))
    session.commit()
    session.refresh(evt)
    
    # Build enriched response with computed fields (same format as get_event)
    now = datetime.now(timezone.utc)
    
    starts_at = evt.starts_at
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=timezone.utc)
    
    ends_at = evt.ends_at
    if ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=timezone.utc)
    
    # Compute states
    is_upcoming = now < starts_at
    is_ongoing = starts_at <= now < ends_at
    is_past = now >= ends_at
    
    status = (
        "ongoing" if is_ongoing else
        "past" if is_past else
        "upcoming"
    )
    
    # Build response manually with computed fields
    response_data = evt.model_dump()
    response_data.update({
        "ends_at": ends_at,
        "is_past": is_past,
        "is_ongoing": is_ongoing,
        "is_upcoming": is_upcoming,
        "status": status,
    })
    
    return response_data


@router.get("")
def list_events(
    session: Session = Depends(get_session),
    q: Optional[str] = None,
    location: Optional[str] = None,
    exam: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    status: str = Query("upcoming"),
    current_user: Optional[User] = Depends(_get_optional_user_from_token),
):
    query = select(Event)
    status = (status or "upcoming").lower()
    if status not in {"upcoming", "past", "ongoing", "all"}:
        raise HTTPException(status_code=400, detail="Invalid status filter")

    # Use timezone-aware datetime consistently
    now = datetime.now(timezone.utc)

    if q:
        like = f"%{q}%"
        query = query.where(
            (Event.title.ilike(like)) |
            (Event.description.ilike(like))
        )

    if location:
        like_loc = f"%{location}%"
        query = query.where(Event.location.ilike(like_loc))

    if exam:
        like_exam = f"%{exam}%"
        query = query.where(Event.exam.ilike(like_exam))

    # For SQL comparison, we need to handle timezone-naive datetimes
    # SQLite stores datetimes as strings, so we compare as naive UTC
    now_naive = now.replace(tzinfo=None) if now.tzinfo else now
    
    if status == "upcoming":
        query = query.where(Event.starts_at > now_naive)

    elif status == "ongoing":
        # Events that have started but not ended
        # We'll filter in Python for accurate ends_at calculation
        query = query.where(Event.starts_at <= now_naive)

    elif status == "past":
        # Events that have ended - query all events that have started
        # We'll filter for ended events in Python
        # For past events, we want to prioritize events that are more likely to be past
        # So we'll order by starts_at DESC to get most recent events first
        query = query.where(Event.starts_at < now_naive)

    # Order by appropriate field based on status
    if status == "past":
        # For past events, order by starts_at DESC to get most recent past events first
        query = query.order_by(Event.starts_at.desc())
    else:
        # For upcoming/ongoing, order by created_at DESC
        query = query.order_by(Event.created_at.desc())
    
    # Optimize: For ongoing/past, we need Python filtering for accurate ends_at
    # Reduce fetch limit to improve performance - most events are either upcoming or past
    # For past: fetch 2x limit (some might be ongoing, but most are past)
    # For ongoing: fetch 2x limit (some might be past, but most are either upcoming or past)
    fetch_limit = limit * 2 if status in ("past", "ongoing") else limit
    query = query.limit(fetch_limit).offset(offset)
    events = session.exec(query).all()
    
    # Filter by status in Python for more accurate ends_at calculation
    # Only do this if we have events to filter
    if events and (status == "ongoing" or status == "past"):
        now_utc = datetime.now(timezone.utc)
        if status == "ongoing":
            # Events that have started but not ended
            filtered_events = []
            for e in events:
                starts_at = e.starts_at.replace(tzinfo=timezone.utc) if e.starts_at.tzinfo is None else e.starts_at
                ends_at = starts_at + timedelta(hours=e.duration)
                if starts_at <= now_utc < ends_at:
                    filtered_events.append(e)
                    if len(filtered_events) >= limit:
                        break
            events = filtered_events
        elif status == "past":
            # Events that have ended - order by most recent first (already sorted by starts_at DESC)
            filtered_events = []
            for e in events:
                starts_at = e.starts_at.replace(tzinfo=timezone.utc) if e.starts_at.tzinfo is None else e.starts_at
                ends_at = starts_at + timedelta(hours=e.duration)
                if ends_at <= now_utc:
                    filtered_events.append(e)
                    if len(filtered_events) >= limit:
                        break
            events = filtered_events

    # =====================================================
    # 🔥 AUTHENTICATED: return extra fields (is_joined & attendee_count)
    # =====================================================
    if current_user:
        event_ids = [e.id for e in events]

        if event_ids:
            # Optimize: Get all attendee data in one query instead of multiple
            all_attendee_records = session.exec(
                select(EventAttendee.event_id, EventAttendee.user_id)
                .where(EventAttendee.event_id.in_(event_ids))
            ).all()

            # Build count map, joined set, and creator tracking in one pass
            count_map = {}
            joined_set = set()
            creator_attendee_set = set()
            
            creator_ids = {e.id: e.created_by for e in events}
            
            for event_id, user_id in all_attendee_records:
                # Count attendees
                count_map[event_id] = count_map.get(event_id, 0) + 1
                # Track if current user joined
                if user_id == current_user.id:
                    joined_set.add(event_id)
                # Track if creator is in attendee table
                if creator_ids.get(event_id) == user_id:
                    creator_attendee_set.add((event_id, user_id))

            # Fix counts - add creator if not in attendee table
            for event in events:
                if event.id not in count_map:
                    count_map[event.id] = 0
                if event.created_by and (event.id, event.created_by) not in creator_attendee_set:
                    count_map[event.id] += 1
                if event.created_by and count_map[event.id] == 0:
                    count_map[event.id] = 1

            # Build response
            now = datetime.now(timezone.utc)
            result = []
            for event in events:
                # Compute event state fields
                starts_at = event.starts_at
                if starts_at.tzinfo is None:
                    starts_at = starts_at.replace(tzinfo=timezone.utc)
                
                ends_at = event.ends_at
                if ends_at.tzinfo is None:
                    ends_at = ends_at.replace(tzinfo=timezone.utc)
                
                is_upcoming = now < starts_at
                is_ongoing = starts_at <= now < ends_at
                is_past = now >= ends_at
                
                status = (
                    "ongoing" if is_ongoing else
                    "past" if is_past else
                    "upcoming"
                )
                
                event_dict = event.model_dump()
                event_dict.update({
                    "ends_at": ends_at,
                    "is_past": is_past,
                    "is_ongoing": is_ongoing,
                    "is_upcoming": is_upcoming,
                    "status": status,
                    "attendee_count": count_map.get(event.id, 0),
                    "is_joined": (
                        event.created_by == current_user.id or
                        event.id in joined_set
                    )
                })
                result.append(event_dict)

            return result

    # =====================================================
    # 🔥 NON-AUTHENTICATED: only attendee_count
    # =====================================================

    event_ids = [e.id for e in events]

    if event_ids:
        # Optimize: Get all attendee data in one query
        all_attendee_records = session.exec(
            select(EventAttendee.event_id, EventAttendee.user_id)
            .where(EventAttendee.event_id.in_(event_ids))
        ).all()

        # Build count map and creator tracking in one pass
        count_map = {}
        creator_attendee_set = set()
        creator_ids = {e.id: e.created_by for e in events}
        
        for event_id, user_id in all_attendee_records:
            count_map[event_id] = count_map.get(event_id, 0) + 1
            if creator_ids.get(event_id) == user_id:
                creator_attendee_set.add((event_id, user_id))

        # Fix counts - add creator if not in attendee table
        for event in events:
            if event.id not in count_map:
                count_map[event.id] = 0
            if event.created_by and (event.id, event.created_by) not in creator_attendee_set:
                count_map[event.id] += 1
            if event.created_by and count_map[event.id] == 0:
                count_map[event.id] = 1

        # Compute event state fields
        now = datetime.now(timezone.utc)
        result = []
        for event in events:
            # Compute event state fields
            starts_at = event.starts_at
            if starts_at.tzinfo is None:
                starts_at = starts_at.replace(tzinfo=timezone.utc)
            
            ends_at = event.ends_at
            if ends_at.tzinfo is None:
                ends_at = ends_at.replace(tzinfo=timezone.utc)
            
            is_upcoming = now < starts_at
            is_ongoing = starts_at <= now < ends_at
            is_past = now >= ends_at
            
            status = (
                "ongoing" if is_ongoing else
                "past" if is_past else
                "upcoming"
            )
            
            event_dict = event.model_dump()
            event_dict.update({
                "ends_at": ends_at,
                "is_past": is_past,
                "is_ongoing": is_ongoing,
                "is_upcoming": is_upcoming,
                "status": status,
                "attendee_count": count_map.get(event.id, 0)
            })
            result.append(event_dict)

        return result

    # Empty response - still compute state fields
    now = datetime.now(timezone.utc)
    result = []
    for event in events:
        starts_at = event.starts_at
        if starts_at.tzinfo is None:
            starts_at = starts_at.replace(tzinfo=timezone.utc)
        
        ends_at = event.ends_at
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        
        is_upcoming = now < starts_at
        is_ongoing = starts_at <= now < ends_at
        is_past = now >= ends_at
        
        status = (
            "ongoing" if is_ongoing else
            "past" if is_past else
            "upcoming"
        )
        
        event_dict = event.model_dump()
        event_dict.update({
            "ends_at": ends_at,
            "is_past": is_past,
            "is_ongoing": is_ongoing,
            "is_upcoming": is_upcoming,
            "status": status
        })
        result.append(event_dict)
    
    return result


@router.get("/my-events/count")
def get_my_events_count(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
    status: str = Query("upcoming")
):
    """Get count of events that the current user is attending or created (lightweight)"""
    from sqlalchemy import or_
    
    status = (status or "upcoming").lower()
    if status not in {"upcoming", "past", "ongoing", "all"}:
        raise HTTPException(status_code=400, detail="Invalid status filter")
    
    # Get event IDs user is attending
    attended_event_ids = session.exec(
        select(EventAttendee.event_id).where(EventAttendee.user_id == current_user.id)
    ).all()
    
    # Build query - handle empty list case
    if not attended_event_ids:
        # Only created events
        query = select(Event).where(Event.created_by == current_user.id)
    else:
        # Events user is attending OR created
        query = select(Event).where(
            or_(
                Event.id.in_(attended_event_ids),
                Event.created_by == current_user.id
            )
        )
    
    # For SQL comparison, use naive datetime
    now_utc = datetime.now(timezone.utc)
    now_naive = now_utc.replace(tzinfo=None)
    
    # Apply basic time filtering in SQL (will refine in Python for ongoing/past)
    if status == "upcoming":
        query = query.where(Event.starts_at > now_naive)
    elif status == "ongoing":
        # Fetch events that have started (will filter by end time in Python)
        query = query.where(Event.starts_at <= now_naive)
    elif status == "past":
        # Fetch events that have started (will filter by end time in Python)
        query = query.where(Event.starts_at < now_naive)
    
    # Get all matching events
    events = session.exec(query).all()
    
    # Filter by status in Python for accurate ends_at calculation
    if status in ("ongoing", "past") and events:
        filtered_events = []
        for e in events:
            starts_at = e.starts_at.replace(tzinfo=timezone.utc) if e.starts_at.tzinfo is None else e.starts_at
            ends_at = starts_at + timedelta(hours=e.duration)
            if status == "ongoing":
                if starts_at <= now_utc < ends_at:
                    filtered_events.append(e)
            elif status == "past":
                if ends_at <= now_utc:
                    filtered_events.append(e)
        events = filtered_events
    
    count = len(events) if events else 0
    return {"count": count}

@router.get("/my-events", response_model=List[EventRead])
def get_my_events(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: str = Query("upcoming")
):
    """Get events that the current user is attending or created (paginated)"""
    from sqlalchemy import or_
    
    status = (status or "upcoming").lower()
    if status not in {"upcoming", "past", "ongoing", "all"}:
        raise HTTPException(status_code=400, detail="Invalid status filter")
    
    # Get event IDs user is attending
    attended_event_ids = session.exec(
        select(EventAttendee.event_id).where(EventAttendee.user_id == current_user.id)
    ).all()
    
    # Build query - handle empty list case
    if not attended_event_ids:
        # Only created events
        query = select(Event).where(Event.created_by == current_user.id)
    else:
        # Events user is attending OR created
        query = select(Event).where(
            or_(
                Event.id.in_(attended_event_ids),
                Event.created_by == current_user.id
            )
        )
    
    # For SQL comparison, use naive datetime
    now_utc = datetime.now(timezone.utc)
    now_naive = now_utc.replace(tzinfo=None)
    
    # Apply basic time filtering in SQL (will refine in Python for ongoing/past)
    if status == "upcoming":
        query = query.where(Event.starts_at > now_naive)
    elif status == "ongoing":
        # Fetch events that have started (will filter by end time in Python)
        query = query.where(Event.starts_at <= now_naive)
    elif status == "past":
        # Fetch events that have started (will filter by end time in Python)
        query = query.where(Event.starts_at < now_naive)
    
    # Order and fetch more for ongoing/past to account for Python filtering
    if status == "past":
        query = query.order_by(Event.starts_at.desc())
    else:
        query = query.order_by(Event.starts_at.asc())
    
    # Fetch more for ongoing/past to account for Python filtering
    fetch_limit = limit * 2 if status in ("ongoing", "past") else limit
    query = query.limit(fetch_limit).offset(offset)
    events = session.exec(query).all()
    
    # Filter by status in Python for accurate ends_at calculation (same as list_events)
    if status in ("ongoing", "past") and events:
        filtered_events = []
        for e in events:
            starts_at = e.starts_at.replace(tzinfo=timezone.utc) if e.starts_at.tzinfo is None else e.starts_at
            ends_at = starts_at + timedelta(hours=e.duration)
            if status == "ongoing":
                if starts_at <= now_utc < ends_at:
                    filtered_events.append(e)
                    if len(filtered_events) >= limit:
                        break
            elif status == "past":
                if ends_at <= now_utc:
                    filtered_events.append(e)
                    if len(filtered_events) >= limit:
                        break
        events = filtered_events
    
    # Enrich with computed fields (same as list_events for authenticated users)
    event_ids = [e.id for e in events]
    
    if event_ids:
        # Get all attendees for these events
        all_attendees = session.exec(
            select(EventAttendee.event_id)
            .where(EventAttendee.event_id.in_(event_ids))
        ).all()

        count_map = dict(Counter(all_attendees))

        # Creator auto-attend fix
        creator_ids = {e.id: e.created_by for e in events}
        creators_in_attendees = session.exec(
            select(EventAttendee.event_id, EventAttendee.user_id)
            .where(
                EventAttendee.event_id.in_(event_ids),
                EventAttendee.user_id.in_(set(creator_ids.values()))
            )
        ).all()

        creator_attendee_set = {
            (ea.event_id, ea.user_id) for ea in creators_in_attendees
        }

        # Fix counts
        for event in events:
            if event.id not in count_map:
                count_map[event.id] = 0
            if event.created_by and (event.id, event.created_by) not in creator_attendee_set:
                count_map[event.id] += 1
            if event.created_by and count_map[event.id] == 0:
                count_map[event.id] = 1

        # User joined events
        user_joined = session.exec(
            select(EventAttendee.event_id)
            .where(
                EventAttendee.event_id.in_(event_ids),
                EventAttendee.user_id == current_user.id
            )
        ).all()
        joined_set = set(user_joined)

        # Build response
        now = datetime.now(timezone.utc)
        result = []
        for event in events:
            # Compute event state fields
            starts_at = event.starts_at
            if starts_at.tzinfo is None:
                starts_at = starts_at.replace(tzinfo=timezone.utc)
            
            ends_at = event.ends_at
            if ends_at.tzinfo is None:
                ends_at = ends_at.replace(tzinfo=timezone.utc)
            
            is_upcoming = now < starts_at
            is_ongoing = starts_at <= now < ends_at
            is_past = now >= ends_at
            
            status = (
                "ongoing" if is_ongoing else
                "past" if is_past else
                "upcoming"
            )
            
            event_dict = event.model_dump()
            event_dict.update({
                "ends_at": ends_at,
                "is_past": is_past,
                "is_ongoing": is_ongoing,
                "is_upcoming": is_upcoming,
                "status": status,
                "attendee_count": count_map.get(event.id, 0),
                "is_joined": (
                    event.created_by == current_user.id or
                    event.id in joined_set
                )
            })
            result.append(event_dict)

        return result
    
    # Empty response - still compute state fields
    now = datetime.now(timezone.utc)
    result = []
    for event in events:
        starts_at = event.starts_at
        if starts_at.tzinfo is None:
            starts_at = starts_at.replace(tzinfo=timezone.utc)
        
        ends_at = event.ends_at
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        
        is_upcoming = now < starts_at
        is_ongoing = starts_at <= now < ends_at
        is_past = now >= ends_at
        
        status = (
            "ongoing" if is_ongoing else
            "past" if is_past else
            "upcoming"
        )
        
        event_dict = event.model_dump()
        event_dict.update({
            "ends_at": ends_at,
            "is_past": is_past,
            "is_ongoing": is_ongoing,
            "is_upcoming": is_upcoming,
            "status": status,
            "attendee_count": 0,
            "is_joined": False
        })
        result.append(event_dict)
    
    return result

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
def get_event(
    event_id: int, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(_get_optional_user_from_token)
):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    now = datetime.now(timezone.utc)

    starts_at = evt.starts_at
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=timezone.utc)

    ends_at = evt.ends_at
    if ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=timezone.utc)

    # Compute states
    is_upcoming = now < starts_at
    is_ongoing = starts_at <= now < ends_at
    is_past = now >= ends_at

    status = (
        "ongoing" if is_ongoing else
        "past" if is_past else
        "upcoming"
    )

    # Award XP retroactively if event has ended and user is an attendee
    if current_user and is_past:
        # Check if user is an attendee or the event creator
        is_attendee = session.exec(
            select(EventAttendee).where(
                EventAttendee.event_id == event_id,
                EventAttendee.user_id == current_user.id
            )
        ).first()
        is_creator = evt.created_by == current_user.id
        
        if is_attendee or is_creator:
            # Award XP (function handles duplicate prevention internally via engagement calculation)
            award_xp_for_event(current_user.id, event_id, session)

    # Build response manually with computed fields
    data = evt.model_dump()
    data.update({
        "ends_at": ends_at,
        "is_past": is_past,
        "is_ongoing": is_ongoing,
        "is_upcoming": is_upcoming,
        "status": status,
    })

    # Add is_joined and attendee_count for authenticated users
    if current_user:
        # Check if user is an attendee
        is_attendee = session.exec(
            select(EventAttendee).where(
                EventAttendee.event_id == event_id,
                EventAttendee.user_id == current_user.id
            )
        ).first()
        
        # Check if user is the creator
        is_creator = evt.created_by == current_user.id
        
        # Get attendee count
        attendee_count = session.exec(
            select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)
        ).one()
        
        # Creator is always counted as an attendee, but might not be in EventAttendee table
        if is_creator and not is_attendee:
            attendee_count += 1
        
        data.update({
            "is_joined": is_creator or bool(is_attendee),
            "attendee_count": attendee_count,
        })
    else:
        # For unauthenticated users, set defaults
        attendee_count = session.exec(
            select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)
        ).one()
        # Add 1 if creator exists (creator is always counted)
        if evt.created_by:
            attendee_count += 1
        data.update({
            "attendee_count": attendee_count,
        })

    return data



@router.patch("/{event_id}", response_model=EventRead)
def update_event(event_id: int, data: EventUpdate, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only the creator can edit
    creator_id = int(evt.created_by) if evt.created_by is not None else None
    if creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    # Apply updates
    updates = data.dict(exclude_unset=True)
    for k, v in updates.items():
        setattr(evt, k, v)

    if getattr(evt, "capacity", 1) < 1:
        raise HTTPException(status_code=422, detail="Capacity must be >= 1")

    session.add(evt)
    session.commit()
    session.refresh(evt)

    # -------------------------------------------------
    # COMPUTE event state fields
    # -------------------------------------------------
    now = datetime.now(timezone.utc)

    starts_at = evt.starts_at
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=timezone.utc)

    ends_at = evt.ends_at
    if ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=timezone.utc)

    is_upcoming = now < starts_at
    is_ongoing = starts_at <= now < ends_at
    is_past = now >= ends_at

    status = (
        "ongoing" if is_ongoing else
        "past" if is_past else
        "upcoming"
    )

    # Build enriched response
    data = evt.model_dump()
    data.update({
        "ends_at": ends_at,
        "is_past": is_past,
        "is_upcoming": is_upcoming,
        "is_ongoing": is_ongoing,
        "status": status,
    })

    return data


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    if evt.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")


    # Delete event itself
    session.delete(evt)
    session.commit()
    return None

@router.post("/{event_id}/join")
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

    # Check if user already joined
    already = session.exec(
        select(EventAttendee)
        .where(EventAttendee.event_id == event_id, EventAttendee.user_id == current_user.id)
    ).first()

    # Count attendees (NOT including creator yet)
    attendee_count = session.exec(
        select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)
    ).one()

    # Include creator if they aren't in attendee table
    creator_in_attendee = session.exec(
        select(EventAttendee)
        .where(EventAttendee.event_id == event_id, EventAttendee.user_id == evt.created_by)
    ).first()
    if not creator_in_attendee:
        attendee_count += 1

    if already:
        return {"success": True, "alreadyJoined": True, "attendee_count": attendee_count}

    # Capacity check (after counting creator)
    if evt.capacity and attendee_count >= evt.capacity:
        raise HTTPException(status_code=409, detail="Event is full")

    # Add attendee
    session.add(EventAttendee(event_id=event_id, user_id=current_user.id))
    session.commit()

    # Recount after joining
    attendee_count = session.exec(
        select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)
    ).one()
    if not creator_in_attendee:
        attendee_count += 1

    # Update presence
    user_presence[current_user.id] = now_utc

    # Note: XP will be awarded retroactively when accessing past events
    # (see get_event and get_event_messages endpoints)

    return {"success": True, "attendee_count": attendee_count}

@router.delete("/{event_id}/join")
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
    ends_at = starts_at + timedelta(hours=evt.duration)

    if now_utc >= starts_at:
        raise HTTPException(
            status_code=400,
            detail="You cannot leave an event that has already started"
        )

    # Check if user is joined
    rec = session.exec(
        select(EventAttendee)
        .where(EventAttendee.event_id == event_id, EventAttendee.user_id == current_user.id)
    ).first()

    # Always compute attendee count helper
    def get_attendee_count():
        base = session.exec(
            select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)
        ).one()

        creator_in_attendee = session.exec(
            select(EventAttendee)
            .where(EventAttendee.event_id == event_id, EventAttendee.user_id == evt.created_by)
        ).first()

        # Add creator if not already counted
        if not creator_in_attendee:
            base += 1

        return base

    # If not joined, just return counts
    if not rec:
        return {"success": True, "notJoined": True, "attendee_count": get_attendee_count()}

    # Remove record
    session.delete(rec)
    session.commit()

    return {"success": True, "attendee_count": get_attendee_count()}

@router.get("/{event_id}/attendees", response_model=List[int])
def list_attendees(event_id: int, session: Session = Depends(get_session)):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get all attendee user_ids
    user_ids = session.exec(
        select(EventAttendee.user_id).where(EventAttendee.event_id == event_id)
    ).all()

    user_ids = [uid for uid in user_ids]

    # ALWAYS include creator (consistent with attendee_count)
    if evt.created_by not in user_ids:
        user_ids.append(evt.created_by)

    return user_ids


@router.get("/{event_id}/attendees/details")
def list_attendees_with_details(event_id: int, session: Session = Depends(get_session)):
    """Get full attendee list with user details, including owner."""
    
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    # Load explicit attendees
    attendee_records = session.exec(
        select(EventAttendee)
        .where(EventAttendee.event_id == event_id)
        .order_by(EventAttendee.joined_at.asc())
    ).all()

    # Build dictionary: user_id -> joined_at
    joined_times = {a.user_id: a.joined_at for a in attendee_records}

    # Ensure creator exists in list
    if evt.created_by not in joined_times:
        # Creator is auto-attendee at event start
        joined_times[evt.created_by] = evt.starts_at

    user_ids = list(joined_times.keys())

    # Load user objects
    users = session.exec(select(User).where(User.id.in_(user_ids))).all()
    user_map = {u.id: u for u in users}

    # Build final list
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

    # Sort by joined_at
    result.sort(key=lambda x: x["joined_at"])

    return result


@router.get("/{event_id}/messages")
def get_event_messages(
    event_id: int, 
    session: Session = Depends(get_session), 
    current_user: Optional[User] = Depends(_get_optional_user_from_token),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Get messages for an event (paginated, most recent first)"""
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Optimized: Load messages with limit, order by desc (newest first) for pagination
    messages = session.exec(
        select(EventMessage)
        .where(EventMessage.event_id == event_id)
        .order_by(EventMessage.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    
    # Reverse to get chronological order (oldest first for display)
    messages = list(reversed(messages))
    
    if not messages:
        return []
    
    user_ids = [msg.user_id for msg in messages]
    users = session.exec(select(User).where(User.id.in_(user_ids))).all()
    user_map = {u.id: u for u in users}
    
    # Get read receipts for all messages
    message_ids = [msg.id for msg in messages]
    read_records = session.exec(
        select(MessageRead).where(
            MessageRead.message_id.in_(message_ids),
            MessageRead.message_type == "event"
        )
    ).all()
    read_map = {}  # {message_id: [user_ids who read it]}
    for read in read_records:
        if read.message_id not in read_map:
            read_map[read.message_id] = []
        read_map[read.message_id].append(read.user_id)
    
    result = []
    for msg in messages:
        user = user_map.get(msg.user_id)
        if user:
            # Ensure timezone-aware datetime with Z suffix for UTC
            created_at_str = msg.created_at.isoformat()
            if msg.created_at.tzinfo is None:
                # If naive datetime, assume UTC
                created_at_str = msg.created_at.replace(tzinfo=timezone.utc).isoformat()
            if not created_at_str.endswith('Z') and msg.created_at.tzinfo == timezone.utc:
                created_at_str = created_at_str.replace('+00:00', 'Z')
            
            # Get read count and check if current user has read it
            read_by = read_map.get(msg.id, [])
            read_count = len(read_by)
            is_read_by_current_user = current_user and current_user.id in read_by if current_user else False
            
            result.append({
                "id": msg.id,
                "content": msg.content if not msg.is_deleted else None,
                "is_deleted": msg.is_deleted,
                "created_at": created_at_str,
                "read_count": read_count,
                "is_read_by_me": is_read_by_current_user,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "photo_url": user.photo_url,
                    "is_verified": user.is_verified
                }
            })
    
    return result

@router.post("/{event_id}/messages")
def post_event_message(
    event_id: int,
    content: str = Query(..., min_length=1, max_length=1000),
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Post a message to an event chat"""
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if user is an attendee or the event owner
    is_attendee = session.exec(
        select(EventAttendee).where(
            EventAttendee.event_id == event_id,
            EventAttendee.user_id == current_user.id
        )
    ).first()
    
    is_owner = evt.created_by == current_user.id
    
    if not is_attendee and not is_owner:
        raise HTTPException(status_code=403, detail="You must be an attendee or event organizer to post messages")
    
    # Update user presence
    user_presence[current_user.id] = datetime.now(timezone.utc)
    
    message = EventMessage(
        event_id=event_id,
        user_id=current_user.id,
        content=content.strip()
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    
    # Ensure timezone-aware datetime with Z suffix for UTC
    created_at_str = message.created_at.isoformat()
    if message.created_at.tzinfo is None:
        # If naive datetime, assume UTC
        created_at_str = message.created_at.replace(tzinfo=timezone.utc).isoformat()
    if not created_at_str.endswith('Z') and message.created_at.tzinfo == timezone.utc:
        created_at_str = created_at_str.replace('+00:00', 'Z')
    
    return {
        "id": message.id,
        "content": message.content,
        "created_at": created_at_str,
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "photo_url": current_user.photo_url,
            "is_verified": current_user.is_verified
        }
    }

@router.delete("/{event_id}/messages/{message_id}")
def delete_event_message(
    event_id: int,
    message_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Delete a message from an event chat (only by message author) - soft delete"""
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    message = session.get(EventMessage, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message.event_id != event_id:
        raise HTTPException(status_code=400, detail="Message does not belong to this event")
    
    # Only the message author can delete their own message
    if message.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")
    
    # Soft delete - mark as deleted instead of removing
    message.is_deleted = True
    message.content = ""  # Clear content for privacy
    session.add(message)
    session.commit()
    session.refresh(message)
    
    # Broadcast deletion to all connected clients via WebSocket
    import asyncio
    import threading
    
    def schedule_broadcast():
        """Schedule broadcast in the main event loop"""
        global _main_event_loop
        try:
            loop = _main_event_loop
            if loop is None:
                # Fallback: try to get the event loop
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    loop = asyncio.get_event_loop()
            
            if loop and loop.is_running():
                # Schedule the coroutine thread-safely
                asyncio.run_coroutine_threadsafe(
                    broadcast_to_event(event_id, None, {
                        "type": "message_deleted",
                        "message_id": message_id
                    }),
                    loop
                )
            elif loop:
                # If loop exists but not running, run it directly
                loop.run_until_complete(broadcast_to_event(event_id, None, {
                    "type": "message_deleted",
                    "message_id": message_id
                }))
        except Exception as e:
            print(f"Failed to broadcast message deletion: {e}")
            import traceback
            traceback.print_exc()
    
    # Run in background thread to avoid blocking the sync endpoint
    threading.Thread(target=schedule_broadcast, daemon=True).start()
    
    return {"message": "Message deleted successfully"}

@router.post("/{event_id}/typing")
def set_typing_status(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Indicate that the current user is typing in the event chat"""
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if user is an attendee or the event owner
    is_attendee = session.exec(
        select(EventAttendee).where(
            EventAttendee.event_id == event_id,
            EventAttendee.user_id == current_user.id
        )
    ).first()
    
    is_owner = evt.created_by == current_user.id
    
    if not is_attendee and not is_owner:
        raise HTTPException(status_code=403, detail="You must be an attendee or event organizer")
    
    # Update typing status (expires after 3 seconds of inactivity)
    typing_status[event_id][current_user.id] = datetime.now(timezone.utc)
    
    # Update user presence
    user_presence[current_user.id] = datetime.now(timezone.utc)
    
    return {"status": "typing"}

@router.get("/{event_id}/typing")
def get_typing_status(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(_get_user_from_token)
):
    """Get list of users currently typing in the event chat"""
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Clean up expired typing statuses (older than 3 seconds)
    now = datetime.now(timezone.utc)
    expired_users = []
    if event_id in typing_status:
        for user_id, last_typing in list(typing_status[event_id].items()):
            if (now - last_typing).total_seconds() > 3:
                expired_users.append(user_id)
        for user_id in expired_users:
            del typing_status[event_id][user_id]
    
    # Get currently typing users (excluding current user)
    typing_user_ids = [
        uid for uid in typing_status.get(event_id, {}).keys()
        if current_user is None or uid != current_user.id
    ]
    
    if not typing_user_ids:
        return {"typing_users": []}
    
    # Fetch user details
    users = session.exec(select(User).where(User.id.in_(typing_user_ids))).all()
    
    return {
        "typing_users": [
            {
                "id": user.id,
                "name": user.name or user.email,
                "photo_url": user.photo_url
            }
            for user in users
        ]
    }

@router.get("/{event_id}/presence")
def get_event_presence(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(_get_user_from_token)
):
    """Get online/offline status for all attendees of an event"""
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get all attendees
    attendees = session.exec(
        select(EventAttendee).where(EventAttendee.event_id == event_id)
    ).all()
    
    # Also include the event owner
    attendee_user_ids = [a.user_id for a in attendees]
    if evt.created_by not in attendee_user_ids:
        attendee_user_ids.append(evt.created_by)
    
    # If authenticated user is viewing the page and is an attendee/owner, update their presence
    if current_user and current_user.id in attendee_user_ids:
        user_presence[current_user.id] = datetime.now(timezone.utc)
    
    if not attendee_user_ids:
        return {"presence": []}
    
    # Clean up expired presence (older than timeout)
    now = datetime.now(timezone.utc)
    expired_users = [
        uid for uid, last_activity in user_presence.items()
        if (now - last_activity).total_seconds() > PRESENCE_TIMEOUT_SECONDS
    ]
    for uid in expired_users:
        del user_presence[uid]
    
    # Fetch user details
    users = session.exec(select(User).where(User.id.in_(attendee_user_ids))).all()
    
    result = []
    for user in users:
        last_activity = user_presence.get(user.id)
        is_online = last_activity and (now - last_activity).total_seconds() <= PRESENCE_TIMEOUT_SECONDS
        
        result.append({
            "id": user.id,
            "name": user.name or user.email,
            "photo_url": user.photo_url,
            "is_online": is_online,
            "last_seen": last_activity.isoformat() if last_activity else None
        })
    
    return {"presence": result}

@router.post("/{event_id}/messages/{message_id}/read")
def mark_event_message_read(
    event_id: int,
    message_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Mark a message as read by the current user"""
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    message = session.get(EventMessage, message_id)
    if not message or message.event_id != event_id:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if already read
    existing_read = session.exec(
        select(MessageRead).where(
            MessageRead.message_id == message_id,
            MessageRead.message_type == "event",
            MessageRead.user_id == current_user.id
        )
    ).first()
    
    if not existing_read:
        read_record = MessageRead(
            message_id=message_id,
            message_type="event",
            user_id=current_user.id
        )
        session.add(read_record)
        session.commit()
    
        return {"status": "read"}

class TextRefinementRequest(BaseModel):
    text: str
    field_type: str = "general"
    context: Optional[str] = None

@router.post("/refine-text")
async def refine_event_text(
    request: TextRefinementRequest,
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """
    Refine and polish user-written text for events.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        refined = await refine_text(
            text=request.text.strip(),
            context=None,
            field_type=request.field_type,
        )
        return {"refined_text": refined}

    except ValueError as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI service configuration error: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refine text: {str(e)}",
        )


class ImageGenerationRequest(BaseModel):
    prompt: str

@router.options("/generate-image")
async def options_generate_image():
    """Handle CORS preflight for image generation"""
    return {}

@router.post("/generate-image")
async def generate_cover_image(
    request: ImageGenerationRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """
    Generate a cover image from a text prompt using AI.
    Returns a base64-encoded image data URL.
    """
    try:
        if not request.prompt or not request.prompt.strip():
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        
        image_data_url = await generate_image(request.prompt.strip())
        return {"image_url": image_data_url}
    except Exception as e:
        print(f"Image generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image: {str(e)}")


# WebSocket endpoint for real-time event chat
@router.websocket("/{event_id}/ws")
async def event_chat_websocket(websocket: WebSocket, event_id: int):
    """WebSocket endpoint for real-time event chat"""
    # Store reference to the main event loop on first connection
    global _main_event_loop
    if _main_event_loop is None:
        import asyncio
        try:
            _main_event_loop = asyncio.get_running_loop()
        except RuntimeError:
            _main_event_loop = asyncio.get_event_loop()
    await websocket.accept()
    
    # Get user from token
    user_id = None
    user_name = None
    user_email = None
    user_photo_url = None
    try:
        token = websocket.query_params.get("token")
        if token:
            from app.core.security import decode_token
            payload = decode_token(token)
            user_id = int(payload.get("sub"))
            
            # Get user details
            session_gen = get_session()
            try:
                session = next(session_gen)
                try:
                    user = session.get(User, user_id)
                    if user:
                        user_name = user.name or user.email
                        user_email = user.email
                        user_photo_url = user.photo_url
                finally:
                    # Close the session by exhausting the generator
                    try:
                        next(session_gen)
                    except StopIteration:
                        pass
            except Exception:
                # If generator fails, try to close it
                try:
                    session_gen.close()
                except:
                    pass
                raise
    except Exception as e:
        await websocket.close(code=1008, reason="Invalid authentication")
        return
    
    if not user_id:
        await websocket.close(code=1008, reason="Authentication required")
        return
    
    # Verify event exists and user has access
    session_gen = get_session()
    try:
        session = next(session_gen)
        evt = session.get(Event, event_id)
        if not evt:
            await websocket.close(code=1008, reason="Event not found")
            return
        
        # Check if user is an attendee or owner
        is_attendee = session.exec(
            select(EventAttendee).where(
                EventAttendee.event_id == event_id,
                EventAttendee.user_id == user_id
            )
        ).first()
        is_owner = evt.created_by == user_id
        
        if not is_attendee and not is_owner:
            await websocket.close(code=1008, reason="Access denied")
            return
        
        # Initialize connection storage
        if event_id not in event_connections:
            event_connections[event_id] = {}
        
        # Add connection
        event_connections[event_id][user_id] = websocket
        
        # Update presence
        user_presence[user_id] = datetime.now(timezone.utc)
        
        # Get message synchronizer for this event
        synchronizer = get_synchronizer(str(event_id), "event")
        
        # Load messages from database and sync with synchronizer
        messages = session.exec(
            select(EventMessage).where(EventMessage.event_id == event_id)
            .order_by(EventMessage.created_at.desc())
            .limit(50)
        ).all()
        
        # Initialize message versions in synchronizer (for existing messages)
        # Process in chronological order to build vector clocks correctly
        sorted_messages = sorted(messages, key=lambda m: m.created_at)
        for msg in sorted_messages:
            created_at = msg.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            
            # Initialize message version in synchronizer
            synchronizer.initialize_message_version(
                message_id=msg.id,
                user_id=msg.user_id,
                content=msg.content if not msg.is_deleted else "",
                created_at=created_at
            )
        
        # Get causally ordered messages from synchronizer
        ordered_versions = synchronizer.get_ordered_messages(limit=50)
        
        # Convert to message list format
        messages_list = []
        for msg_version in ordered_versions:
            msg = session.get(EventMessage, msg_version.message_id)
            if not msg:
                continue
                
            msg_user = session.get(User, msg.user_id)
            created_at_str = msg.created_at.isoformat()
            if msg.created_at.tzinfo is None:
                created_at_str = msg.created_at.replace(tzinfo=timezone.utc).isoformat()
            if not created_at_str.endswith('Z') and msg.created_at.tzinfo == timezone.utc:
                created_at_str = created_at_str.replace('+00:00', 'Z')
            
            # Check if message is read by current user
            is_read = False
            if user_id:
                read_record = session.exec(
                    select(MessageRead).where(
                        MessageRead.message_id == msg.id,
                        MessageRead.user_id == user_id
                    )
                ).first()
                is_read = read_record is not None
            
            messages_list.append({
                "id": msg.id,
                "content": msg.content if not msg.is_deleted else "",
                "is_deleted": msg.is_deleted,
                "created_at": created_at_str,
                "vector_clock": msg_version.vector_clock,  # Include vector clock
                "version": msg_version.version,
                "is_read_by_me": is_read,
                "user": {
                    "id": msg_user.id if msg_user else user_id,
                    "name": msg_user.name if msg_user else "Unknown",
                    "email": msg_user.email if msg_user else "",
                    "photo_url": msg_user.photo_url if msg_user else None,
                    "is_verified": msg_user.is_verified if msg_user else False
                }
            })
        
        await websocket.send_json({
            "type": "initial_messages",
            "messages": messages_list
        })
        
        # Broadcast user joined
        await broadcast_to_event(event_id, user_id, {
            "type": "user_joined",
            "user_id": user_id,
            "user_name": user_name,
            "user_photo_url": user_photo_url
        })
        
        # Handle messages
        try:
            while True:
                # Check if WebSocket is still connected
                if websocket.client_state.name != "CONNECTED":
                    break
                
                try:
                    data = await websocket.receive_json()
                    message_type = data.get("type")
                    
                    # Handle incoming message sync (from other clients)
                    if message_type == "sync_message":
                        # Client is sending a message with vector clock for sync
                        incoming_msg = data.get("message")
                        if incoming_msg:
                            synchronizer = get_synchronizer(str(event_id), "event")
                            msg_version = MessageVersion(
                                message_id=incoming_msg.get("id"),
                                vector_clock=incoming_msg.get("vector_clock", {}),
                                content=incoming_msg.get("content", ""),
                                user_id=incoming_msg.get("user_id"),
                                created_at=datetime.fromisoformat(incoming_msg.get("created_at", "").replace('Z', '+00:00'))
                            )
                            is_new, merged = synchronizer.merge_message(msg_version)
                            if is_new:
                                # Broadcast the merged message
                                await broadcast_to_event(event_id, user_id, {
                                    "type": "new_message",
                                    "message": incoming_msg
                                })
                        continue
                    
                    if message_type == "message":
                        # Check if event has ended - if so, chat is read-only
                        now = datetime.now(timezone.utc)
                        starts_at = evt.starts_at.replace(tzinfo=timezone.utc) if evt.starts_at.tzinfo is None else evt.starts_at
                        ends_at = evt.ends_at if evt.ends_at else (starts_at + timedelta(hours=evt.duration))
                        if ends_at.tzinfo is None:
                            ends_at = ends_at.replace(tzinfo=timezone.utc)
                        
                        is_past = now >= ends_at
                        if is_past:
                            # Event has ended - send error message
                            await websocket.send_json({
                                "type": "error",
                                "message": "This event has ended. Chat is now read-only. You can still view message history."
                            })
                            continue
                        
                        # Send a new message
                        content = data.get("content", "").strip()
                        if not content or len(content) > 1000:
                            continue
                        
                        # Get synchronizer for this event
                        synchronizer = get_synchronizer(str(event_id), "event")
                        
                        # Create message in database
                        message = EventMessage(
                            event_id=event_id,
                            user_id=user_id,
                            content=content
                        )
                        session.add(message)
                        session.commit()
                        session.refresh(message)
                        
                        # Create message version with vector clock
                        created_at = message.created_at
                        if created_at.tzinfo is None:
                            created_at = created_at.replace(tzinfo=timezone.utc)
                        
                        msg_version = synchronizer.create_message_version(
                            message_id=message.id,
                            user_id=user_id,
                            content=content,
                            created_at=created_at
                        )
                        
                        # Update presence
                        user_presence[user_id] = datetime.now(timezone.utc)
                        
                        # Format created_at
                        created_at_str = message.created_at.isoformat()
                        if message.created_at.tzinfo is None:
                            created_at_str = message.created_at.replace(tzinfo=timezone.utc).isoformat()
                        if not created_at_str.endswith('Z') and message.created_at.tzinfo == timezone.utc:
                            created_at_str = created_at_str.replace('+00:00', 'Z')
                        
                        # Get user for message
                        msg_user = session.get(User, user_id)
                        
                        # Broadcast message to all connected users with vector clock
                        await broadcast_to_event(event_id, None, {
                            "type": "new_message",
                            "message": {
                                "id": message.id,
                                "content": message.content,
                                "is_deleted": False,
                                "created_at": created_at_str,
                                "vector_clock": msg_version.vector_clock,  # Include vector clock
                                "version": msg_version.version,
                                "is_read_by_me": False,
                                "user": {
                                    "id": user_id,
                                    "name": msg_user.name if msg_user else user_name,
                                    "email": msg_user.email if msg_user else user_email,
                                    "photo_url": msg_user.photo_url if msg_user else user_photo_url,
                                    "is_verified": msg_user.is_verified if msg_user else False
                                }
                            }
                        })
                    
                    elif message_type == "typing":
                        # Update typing status
                        typing_status[event_id][user_id] = datetime.now(timezone.utc)
                        user_presence[user_id] = datetime.now(timezone.utc)
                        
                        # Broadcast typing indicator
                        await broadcast_to_event(event_id, user_id, {
                            "type": "typing",
                            "user_id": user_id,
                            "user_name": user_name
                        })
                    
                    elif message_type == "presence_ping":
                        # Update presence
                        user_presence[user_id] = datetime.now(timezone.utc)
                        
                        # Send current presence
                        now = datetime.now(timezone.utc)
                        online_users = []
                        if event_id in event_connections:
                            for uid in event_connections[event_id].keys():
                                if uid != user_id and uid in user_presence:
                                    if (now - user_presence[uid]).total_seconds() < PRESENCE_TIMEOUT_SECONDS:
                                        online_users.append(uid)
                        
                        await websocket.send_json({
                            "type": "presence_update",
                            "online_users": online_users
                        })
                    
                    elif message_type == "mark_read":
                        # Mark message as read
                        message_id = data.get("message_id")
                        if message_id:
                            try:
                                # Check if already read to avoid duplicates
                                existing_read = session.exec(
                                    select(MessageRead).where(
                                        MessageRead.message_id == message_id,
                                        MessageRead.message_type == "event",
                                        MessageRead.user_id == user_id
                                    )
                                ).first()
                                
                                if not existing_read:
                                    read_record = MessageRead(
                                        message_id=message_id,
                                        message_type="event",  # Required field!
                                        user_id=user_id
                                    )
                                    session.add(read_record)
                                    session.commit()
                                    
                                    # Broadcast read receipt
                                    await broadcast_to_event(event_id, user_id, {
                                        "type": "message_read",
                                        "message_id": message_id,
                                        "user_id": user_id
                                    })
                            except Exception as e:
                                # Rollback on error to prevent session issues
                                session.rollback()
                                print(f"Error marking message as read: {e}")
                                # Don't break the connection, just log the error
                except WebSocketDisconnect:
                    # Normal disconnect, break out of loop
                    print("WebSocket disconnected normally")
                    break
                except RuntimeError as e:
                    # Handle "Cannot call receive once disconnected" error
                    if "disconnect" in str(e).lower():
                        print("WebSocket disconnected (RuntimeError)")
                        break
                    # Re-raise other RuntimeErrors
                    raise
                except Exception as e:
                    # Log error but continue if connection is still open
                    print(f"Error processing WebSocket message: {e}")
                    # Check if still connected before continuing
                    if websocket.client_state.name != "CONNECTED":
                        break
                    continue
                
        except WebSocketDisconnect:
            print("WebSocket disconnected normally")
            pass
        except RuntimeError as e:
            # Handle "Cannot call receive once disconnected" error
            if "disconnect" in str(e).lower():
                print("WebSocket disconnected (RuntimeError in outer catch)")
            else:
                print(f"WebSocket RuntimeError: {e}")
        except Exception as e:
            # Log unexpected errors
            print(f"WebSocket error in main loop: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # Remove connection
            if event_id in event_connections and user_id in event_connections[event_id]:
                del event_connections[event_id][user_id]
            
            # Broadcast user left
            await broadcast_to_event(event_id, user_id, {
                "type": "user_left",
                "user_id": user_id
            })
    finally:
        # Properly close the session
        try:
            if 'session_gen' in locals():
                try:
                    next(session_gen)
                except StopIteration:
                    pass
                except Exception:
                    try:
                        session_gen.close()
                    except:
                        pass
        except:
            pass

async def broadcast_to_event(event_id: int, exclude_user_id: Optional[int], message: Dict):
    """Broadcast message to all connected users in an event"""
    if event_id not in event_connections:
        return
    
    disconnected = []
    for user_id, ws in event_connections[event_id].items():
        if exclude_user_id is None or user_id != exclude_user_id:
            try:
                await ws.send_json(message)
            except:
                disconnected.append(user_id)
    
    # Clean up disconnected users
    for user_id in disconnected:
        if event_id in event_connections and user_id in event_connections[event_id]:
            del event_connections[event_id][user_id]