from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel import Session
from app.db import get_session
from app.models import Group, GroupCreate
import uuid
import random

router = APIRouter()

@router.get("", response_model=list[Group])
def list_groups(session: Session = Depends(get_session)):
    return session.exec(select(Group).order_by(Group.name)).all()

@router.post("", response_model=Group, status_code=201)
def create_group(payload: GroupCreate, session: Session = Depends(get_session)):
    grp = Group(id=str(uuid.uuid4()), members=random.randint(1, 50), **payload.model_dump())
    session.add(grp)
    session.commit()
    session.refresh(grp)
    return grp

@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: str, session: Session = Depends(get_session)):
    obj = session.get(Group, group_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Group not found")
    session.delete(obj)
    session.commit()
    return
