from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlmodel import Session, select, func
from app.db import get_session
from app.models import Event, User, EventAttendee, Group, GroupMember
from app.schemas.events import EventCreate, EventRead, EventUpdate
from app.routers.auth import _get_user_from_token
from app.routers.badges import award_xp_for_event
from app.services.ai import generate_event_suggestions, refine_text, generate_image
from pydantic import BaseModel
from datetime import datetime, timedelta

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
    
    from datetime import datetime
    if evt.starts_at < datetime.utcnow():
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