from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Header, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select, func, or_
from app.db import get_session
from app.models import Event, User, EventAttendee, Group, GroupMember, EventMessage, MessageRead, MessageReaction
from app.schemas.events import EventCreate, EventRead, EventUpdate
from app.routers.auth import _get_user_from_token
from app.routers.badges import award_xp_for_event
from app.services.ai import generate_event_suggestions, refine_text, generate_image
from app.services.message_sync import MessageSynchronizer, MessageVersion, get_synchronizer
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from collections import defaultdict

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
    query = query.order_by(Event.created_at.desc()).limit(limit).offset(offset)
    return session.exec(query).all()

@router.get("/my-events", response_model=List[EventRead])
def get_my_events(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Get all events that the current user is attending or created"""
    # Get user's attendances
    user_attendances = session.exec(
        select(EventAttendee).where(EventAttendee.user_id == current_user.id)
    ).all()
    
    # Get event IDs user is attending
    attended_event_ids = {a.event_id for a in user_attendances}
    
    # Get events user created
    created_events = session.exec(
        select(Event).where(Event.created_by == current_user.id)
    ).all()
    created_event_ids = {e.id for e in created_events}
    
    # Combine both sets
    all_event_ids = attended_event_ids | created_event_ids
    
    if not all_event_ids:
        return []
    
    # Get all events (attending or created), ordered by start date (upcoming first)
    events = session.exec(
        select(Event)
        .where(Event.id.in_(all_event_ids))
        .order_by(Event.starts_at.asc())
    ).all()
    
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
    
    # Update user presence when joining
    user_presence[current_user.id] = datetime.now(timezone.utc)
    
    if evt.starts_at < datetime.now(timezone.utc):
        award_xp_for_event(current_user.id, event_id, session)
    
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

@router.get("/{event_id}/attendees/details")
def list_attendees_with_details(event_id: int, session: Session = Depends(get_session)):
    """Get list of attendees with user details"""
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    attendee_records = session.exec(
        select(EventAttendee)
        .where(EventAttendee.event_id == event_id)
        .order_by(EventAttendee.joined_at)
    ).all()
    
    if not attendee_records:
        return []
    
    user_ids = [a.user_id for a in attendee_records]
    if not user_ids:
        return []
    
    users = session.exec(select(User).where(User.id.in_(user_ids))).all()
    user_map = {u.id: u for u in users}
    
    result = []
    for attendee_rec in attendee_records:
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
def get_event_messages(event_id: int, session: Session = Depends(get_session), current_user: Optional[User] = Depends(_get_user_from_token)):
    """Get all messages for an event"""
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    messages = session.exec(
        select(EventMessage)
        .where(EventMessage.event_id == event_id)
        .order_by(EventMessage.created_at)
    ).all()
    
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
    
    # Get reactions for all messages
    reaction_records = session.exec(
        select(MessageReaction).where(
            MessageReaction.message_id.in_(message_ids),
            MessageReaction.message_type == "event"
        )
    ).all()
    reaction_map = {}  # {message_id: {emoji: [user_ids]}}
    for reaction in reaction_records:
        if reaction.message_id not in reaction_map:
            reaction_map[reaction.message_id] = {}
        if reaction.emoji not in reaction_map[reaction.message_id]:
            reaction_map[reaction.message_id][reaction.emoji] = []
        reaction_map[reaction.message_id][reaction.emoji].append(reaction.user_id)
    
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
            
            # Get reactions for this message
            message_reactions = reaction_map.get(msg.id, {})
            reactions = []
            for emoji, user_ids in message_reactions.items():
                reactions.append({
                    "emoji": emoji,
                    "count": len(user_ids),
                    "users": user_ids,
                    "has_reacted": current_user and current_user.id in user_ids if current_user else False
                })
            
            result.append({
                "id": msg.id,
                "content": msg.content if not msg.is_deleted else None,
                "is_deleted": msg.is_deleted,
                "created_at": created_at_str,
                "read_count": read_count,
                "is_read_by_me": is_read_by_current_user,
                "reactions": reactions,
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

@router.post("/{event_id}/messages/{message_id}/reactions")
def add_event_message_reaction(
    event_id: int,
    message_id: int,
    emoji: str = Query(..., min_length=1, max_length=10),
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Add or remove a reaction to a message"""
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    message = session.get(EventMessage, message_id)
    if not message or message.event_id != event_id:
        raise HTTPException(status_code=404, detail="Message not found")
    
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
    
    # Check if reaction already exists
    existing_reaction = session.exec(
        select(MessageReaction).where(
            MessageReaction.message_id == message_id,
            MessageReaction.message_type == "event",
            MessageReaction.user_id == current_user.id,
            MessageReaction.emoji == emoji
        )
    ).first()
    
    if existing_reaction:
        # Remove reaction (toggle off)
        session.delete(existing_reaction)
        session.commit()
        return {"status": "removed", "emoji": emoji}
    else:
        # Add reaction
        reaction = MessageReaction(
            message_id=message_id,
            message_type="event",
            user_id=current_user.id,
            emoji=emoji
        )
        session.add(reaction)
        session.commit()
        return {"status": "added", "emoji": emoji}

@router.get("/ai-suggest")
async def get_ai_event_suggestions(
    num_suggestions: int = Query(3, ge=1, le=3),
    preferred_location: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """
    Generate AI-powered event suggestions based on user's context.
    Gathers user's groups, recent events, and preferences to create personalized suggestions.
    """
    try:
        memberships = session.exec(
            select(GroupMember).where(GroupMember.user_id == current_user.id)
        ).all()
        
        groups_context = []
        for membership in memberships:
            group = session.get(Group, membership.group_id)
            if not group:
                continue
            group_data = {
                "name": group.name,
                "field": group.field,
                "exam": group.exam,
                "deadline": group.deadline.isoformat() if group.deadline else None,
                "description": group.description
            }
            groups_context.append(group_data)
        
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        attendee_records = session.exec(
            select(EventAttendee).where(EventAttendee.user_id == current_user.id)
        ).all()
        
        recent_events_context = []
        for attendee in attendee_records[:10]:
            event = session.get(Event, attendee.event_id)
            if event and event.starts_at >= thirty_days_ago:
                recent_events_context.append({
                    "title": event.title,
                    "location": event.location,
                    "category": getattr(event, "category", None)
                })
                if len(recent_events_context) >= 5:
                    break
        
        user_context = {
            "groups": groups_context,
            "recent_events": recent_events_context
        }
        
        if preferred_location:
            user_context["preferred_location"] = preferred_location
        
        suggestions = await generate_event_suggestions(
            user_context=user_context,
            num_suggestions=num_suggestions
        )
        
        return suggestions
        
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"AI service configuration error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")

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
            session = next(session_gen)
            try:
                user = session.get(User, user_id)
                if user:
                    user_name = user.name or user.email
                    user_email = user.email
                    user_photo_url = user.photo_url
            finally:
                try:
                    next(session_gen)
                except StopIteration:
                    pass
    except Exception as e:
        await websocket.close(code=1008, reason="Invalid authentication")
        return
    
    if not user_id:
        await websocket.close(code=1008, reason="Authentication required")
        return
    
    # Verify event exists and user has access
    session_gen = get_session()
    session = next(session_gen)
    try:
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
                        read_record = MessageRead(
                            message_id=message_id,
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
                
        except WebSocketDisconnect:
            pass
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
        try:
            next(session_gen)
        except StopIteration:
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