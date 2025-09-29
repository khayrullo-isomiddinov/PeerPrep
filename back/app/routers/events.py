from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel import SQLModel
from sqlmodel import Session
from app.db import get_session
from app.models import Event, EventCreate
import uuid

router = APIRouter()

@router.get("", response_model=list[Event])
def list_events(session: Session = Depends(get_session)):
    return session.exec(select(Event).order_by(Event.date.desc())).all()

@router.post("", response_model=Event, status_code=201)
def create_event(payload: EventCreate, session: Session = Depends(get_session)):
    ev = Event(id=str(uuid.uuid4()), **payload.model_dump())
    session.add(ev)
    session.commit()
    session.refresh(ev)
    return ev

@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: str, session: Session = Depends(get_session)):
    obj = session.get(Event, event_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Event not found")
    session.delete(obj)
    session.commit()
    return
