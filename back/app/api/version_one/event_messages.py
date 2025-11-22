from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from app.core.db import get_session
from app.models import Event, User, EventAttendee, EventMessage, MessageRead
from datetime import datetime, timezone, timedelta
from app.api.version_one.auth import _get_user_from_token, _get_optional_user_from_token
from app.api.version_one.badges import award_xp_for_event

router = APIRouter(prefix="/events/{event_id}/messages", tags=["events"])

@router.get("")
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
    
    # Award XP retroactively if event has ended and user is an attendee
    if current_user:
        now = datetime.now(timezone.utc)
        starts_at = evt.starts_at.replace(tzinfo=timezone.utc) if evt.starts_at.tzinfo is None else evt.starts_at
        ends_at = evt.ends_at if evt.ends_at else (starts_at + timedelta(hours=evt.duration))
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        
        is_past = now >= ends_at
        
        if is_past:
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

@router.post("")
def post_event_message(
    event_id: int,
    content: str = Query(..., min_length=1, max_length=1000),
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Post a message to an event chat. Only allowed before event ends (read-only after event ends)."""
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if event has ended - if so, chat is read-only
    now = datetime.now(timezone.utc)
    starts_at = evt.starts_at.replace(tzinfo=timezone.utc) if evt.starts_at.tzinfo is None else evt.starts_at
    ends_at = evt.ends_at if evt.ends_at else (starts_at + timedelta(hours=evt.duration))
    if ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=timezone.utc)
    
    is_past = now >= ends_at
    if is_past:
        raise HTTPException(
            status_code=403,
            detail="This event has ended. Chat is now read-only. You can still view message history."
        )
    
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

@router.delete("/{message_id}")
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

@router.post("/{message_id}/read")
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
