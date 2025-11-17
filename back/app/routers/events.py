from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Header, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select, func
from app.db import get_session
from app.models import Event, User, EventAttendee, Group, GroupMember, EventMessage, MessageRead
from app.schemas.events import EventCreate, EventRead, EventUpdate
from app.routers.auth import _get_user_from_token, _get_optional_user_from_token
from app.routers.badges import award_xp_for_event
from app.services.ai import refine_text, generate_image
from app.services.message_sync import MessageSynchronizer, MessageVersion, get_synchronizer
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from collections import defaultdict, Counter

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
    evt = Event(**data.dict(), created_by=current_user.id)
    session.add(evt)
    session.commit()
    session.refresh(evt)
    session.add(EventAttendee(event_id=evt.id, user_id=current_user.id))
    session.commit()
    session.refresh(evt)
    return evt


@router.get("")
def list_events(
    session: Session = Depends(get_session),
    kind: Optional[str] = None,
    group_id: Optional[int] = None,
    q: Optional[str] = None,
    location: Optional[str] = None,
    exam: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Optional[User] = Depends(_get_optional_user_from_token),
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
    if exam:
        like_exam = f"%{exam}%"
        query = query.where(Event.exam.ilike(like_exam))
    query = query.order_by(Event.created_at.desc()).limit(limit).offset(offset)
    events = session.exec(query).all()
    
    # If user is authenticated, enrich events with join status and attendee counts
    if current_user:
        event_ids = [e.id for e in events]
        if event_ids:
            # Get all attendee counts in one query using a more efficient approach
            # Get all attendees for these events, then count in Python (faster than multiple queries)
            all_attendees = session.exec(
                select(EventAttendee.event_id)
                .where(EventAttendee.event_id.in_(event_ids))
            ).all()
            # Count attendees per event
            count_map = dict(Counter(all_attendees))
            
            # Get all creator IDs for these events to check if they're in EventAttendee
            creator_ids = {e.id: e.created_by for e in events}
            # Check which creators are already in EventAttendee (batch query)
            creators_in_attendees = session.exec(
                select(EventAttendee.event_id, EventAttendee.user_id).where(
                    EventAttendee.event_id.in_(event_ids),
                    EventAttendee.user_id.in_(set(creator_ids.values()))
                )
            ).all()
            # Create a set of (event_id, user_id) tuples for fast lookup
            creator_attendee_set = {(ea.event_id, ea.user_id) for ea in creators_in_attendees}
            
            # Always include the creator in the count (even if not in EventAttendee for old/seeded events)
            for event in events:
                if event.id not in count_map:
                    count_map[event.id] = 0
                # Creator is always counted as an attendee (for backwards compatibility with old events)
                # Check if creator is already in EventAttendee to avoid double-counting
                if event.created_by and (event.id, event.created_by) not in creator_attendee_set:
                    # Creator not in EventAttendee (old/seeded event), add them to count
                    count_map[event.id] += 1
                # Ensure minimum count of 1 if event has a creator
                if event.created_by and count_map[event.id] == 0:
                    count_map[event.id] = 1
            
            # Get user's joined events in one query
            user_joined_events = session.exec(
                select(EventAttendee.event_id).where(
                    EventAttendee.event_id.in_(event_ids),
                    EventAttendee.user_id == current_user.id
                )
            ).all()
            joined_set = set(user_joined_events)
            
            # Enrich events with additional data
            result = []
            for event in events:
                event_dict = event.model_dump()
                event_dict["attendee_count"] = count_map.get(event.id, 0)
                event_dict["is_joined"] = (
                    event.created_by == current_user.id or 
                    event.id in joined_set
                )
                result.append(event_dict)
            return result
    
    # If not authenticated, still calculate attendee counts (but not join status)
    event_ids = [e.id for e in events]
    if event_ids:
        # Get all attendee counts
        all_attendees = session.exec(
            select(EventAttendee.event_id)
            .where(EventAttendee.event_id.in_(event_ids))
        ).all()
        count_map = dict(Counter(all_attendees))
        
        # Get creator IDs and check if they're in EventAttendee
        creator_ids = {e.id: e.created_by for e in events}
        creators_in_attendees = session.exec(
            select(EventAttendee.event_id, EventAttendee.user_id).where(
                EventAttendee.event_id.in_(event_ids),
                EventAttendee.user_id.in_(set(creator_ids.values()))
            )
        ).all()
        creator_attendee_set = {(ea.event_id, ea.user_id) for ea in creators_in_attendees}
        
        # Always include the creator in the count
        for event in events:
            if event.id not in count_map:
                count_map[event.id] = 0
            if event.created_by and (event.id, event.created_by) not in creator_attendee_set:
                count_map[event.id] += 1
            # Ensure minimum count of 1 if event has a creator
            if event.created_by and count_map[event.id] == 0:
                count_map[event.id] = 1
        
        # Return events with attendee_count
        result = []
        for event in events:
            event_dict = event.model_dump()
            event_dict["attendee_count"] = count_map.get(event.id, 0)
            result.append(event_dict)
        return result
    
    # If no events, return empty list
    return [e.model_dump() for e in events]

@router.get("/my-events/count")
def get_my_events_count(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Get count of events that the current user is attending or created (lightweight)"""
    from sqlmodel import or_
    
    # Get event IDs user is attending
    attended_event_ids = session.exec(
        select(EventAttendee.event_id).where(EventAttendee.user_id == current_user.id)
    ).all()
    
    # Build query - handle empty list case
    if not attended_event_ids:
        # Only created events
        query = select(func.count(Event.id)).where(Event.created_by == current_user.id)
    else:
        # Events user is attending OR created
        query = select(func.count(Event.id)).where(
            or_(
                Event.id.in_(attended_event_ids),
                Event.created_by == current_user.id
            )
        )
    
    count = session.exec(query).one() or 0
    return {"count": count}

@router.get("/my-events", response_model=List[EventRead])
def get_my_events(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get events that the current user is attending or created (paginated)"""
    from sqlmodel import or_
    
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
    
    query = query.order_by(Event.starts_at.asc()).limit(limit).offset(offset)
    events = session.exec(query).all()
    return list(events)

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

@router.post("/{event_id}/join")
def join_event(event_id: int, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    exists = session.exec(select(EventAttendee).where(EventAttendee.event_id == event_id, EventAttendee.user_id == current_user.id)).first()
    if exists:
        # Already joined - return current count (including creator)
        count = session.exec(select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)).one()
        # Check if creator is in EventAttendee, if not add 1
        creator_in_attendees = session.exec(
            select(EventAttendee).where(EventAttendee.event_id == event_id, EventAttendee.user_id == evt.created_by)
        ).first()
        if not creator_in_attendees:
            count += 1
        return {"success": True, "alreadyJoined": True, "attendee_count": count}
    count = session.exec(select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)).one()
    # Check if creator is in EventAttendee, if not add 1
    creator_in_attendees = session.exec(
        select(EventAttendee).where(EventAttendee.event_id == event_id, EventAttendee.user_id == evt.created_by)
    ).first()
    if not creator_in_attendees:
        count += 1
    if count >= evt.capacity:
        raise HTTPException(status_code=409, detail="Event is full")
    rec = EventAttendee(event_id=event_id, user_id=current_user.id)
    session.add(rec)
    session.commit()
    
    # Get updated count after join (including creator)
    count = session.exec(select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)).one()
    # Check if creator is in EventAttendee, if not add 1
    creator_in_attendees = session.exec(
        select(EventAttendee).where(EventAttendee.event_id == event_id, EventAttendee.user_id == evt.created_by)
    ).first()
    if not creator_in_attendees:
        count += 1
    
    # Update user presence when joining
    user_presence[current_user.id] = datetime.now(timezone.utc)
    
    # Compare datetimes - ensure both are timezone-aware
    now_utc = datetime.now(timezone.utc)
    event_starts_at = evt.starts_at
    # If event datetime is naive, make it aware (assume UTC)
    if event_starts_at.tzinfo is None:
        event_starts_at = event_starts_at.replace(tzinfo=timezone.utc)
    
    if event_starts_at < now_utc:
        award_xp_for_event(current_user.id, event_id, session)
    
    return {"success": True, "attendee_count": count}

@router.delete("/{event_id}/join")
def leave_event(event_id: int, session: Session = Depends(get_session), current_user: User = Depends(_get_user_from_token)):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    rec = session.exec(select(EventAttendee).where(EventAttendee.event_id == event_id, EventAttendee.user_id == current_user.id)).first()
    if not rec:
        # Not joined - return current count (including creator)
        count = session.exec(select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)).one()
        # Check if creator is in EventAttendee, if not add 1
        creator_in_attendees = session.exec(
            select(EventAttendee).where(EventAttendee.event_id == event_id, EventAttendee.user_id == evt.created_by)
        ).first()
        if not creator_in_attendees:
            count += 1
        return {"success": True, "notJoined": True, "attendee_count": count}
    session.delete(rec)
    session.commit()
    
    # Get updated count after leave (including creator)
    count = session.exec(select(func.count()).select_from(EventAttendee).where(EventAttendee.event_id == event_id)).one()
    # Check if creator is in EventAttendee, if not add 1
    creator_in_attendees = session.exec(
        select(EventAttendee).where(EventAttendee.event_id == event_id, EventAttendee.user_id == evt.created_by)
    ).first()
    if not creator_in_attendees:
        count += 1
    
    return {"success": True, "attendee_count": count}

@router.get("/{event_id}/attendees", response_model=List[int])
def list_attendees(event_id: int, session: Session = Depends(get_session)):
    session.get(Event, event_id) or (_ for _ in ()).throw(HTTPException(status_code=404, detail="Event not found"))
    rows = session.exec(select(EventAttendee.user_id).where(EventAttendee.event_id == event_id)).all()
    return [r for r in rows]

@router.get("/{event_id}/attendees/details")
def list_attendees_with_details(event_id: int, session: Session = Depends(get_session)):
    """Get list of attendees with user details (includes event owner)"""
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    attendee_records = session.exec(
        select(EventAttendee)
        .where(EventAttendee.event_id == event_id)
        .order_by(EventAttendee.joined_at)
    ).all()
    
    # Collect user IDs from attendees
    user_ids = [a.user_id for a in attendee_records]
    
    # Always include the event owner in the list (even if they haven't explicitly joined)
    if evt.created_by and evt.created_by not in user_ids:
        user_ids.append(evt.created_by)
    
    if not user_ids:
        return []
    
    users = session.exec(select(User).where(User.id.in_(user_ids))).all()
    user_map = {u.id: u for u in users}
    
    result = []
    
    # First, add the event owner if they exist
    if evt.created_by:
        owner = user_map.get(evt.created_by)
        if owner:
            # Check if owner has an attendee record (explicit join)
            owner_attendee = next((a for a in attendee_records if a.user_id == evt.created_by), None)
            result.append({
                "id": owner.id,
                "name": owner.name,
                "email": owner.email,
                "photo_url": owner.photo_url,
                "is_verified": owner.is_verified,
                "joined_at": owner_attendee.joined_at.isoformat() if owner_attendee and owner_attendee.joined_at else evt.created_at.isoformat() if evt.created_at else None
            })
    
    # Then add all other attendees (excluding owner if already added)
    for attendee_rec in attendee_records:
        # Skip if this is the owner (already added above)
        if attendee_rec.user_id == evt.created_by:
            continue
            
        user = user_map.get(attendee_rec.user_id)
        if user:
            result.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "photo_url": user.photo_url,
                "is_verified": user.is_verified,
                "joined_at": attendee_rec.joined_at.isoformat() if attendee_rec.joined_at else None
            })
    
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
    Takes the user's text and returns an improved, polished version.
    """
    try:
        print(f"🔍 Refine text - Authorization header received: {authorization[:50] if authorization else 'None'}...")
        print(f"🔍 Refine text - Current user: {current_user.email if current_user else 'None'}")
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        context_parts = []
        memberships = session.exec(
            select(GroupMember).where(GroupMember.user_id == current_user.id)
        ).all()
        
        if memberships:
            first_membership = memberships[0]
            group = session.get(Group, first_membership.group_id)
            if group:
                context_parts.append(f"Field: {group.field}")
                if group.exam:
                    context_parts.append(f"Exam: {group.exam}")
        
        refined = await refine_text(
            text=request.text,
            context=None,
            field_type=request.field_type
        )
        
        return {"refined_text": refined}
        
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"AI service configuration error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refine text: {str(e)}")

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