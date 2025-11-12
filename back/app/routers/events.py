from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlmodel import Session, select, func
from app.db import get_session
from app.models import Event, User, EventAttendee, Group, GroupMember, EventMessage, MessageRead, MessageReaction
from app.schemas.events import EventCreate, EventRead, EventUpdate
from app.routers.auth import _get_user_from_token
from app.routers.badges import award_xp_for_event
from app.services.ai import generate_event_suggestions, refine_text, generate_image
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