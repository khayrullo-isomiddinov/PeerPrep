from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func
from typing import List, Optional
from datetime import datetime
import secrets
import string

from app.db import get_session
from app.models import Group, GroupMember, User
from app.schemas.groups import (
    GroupCreate, GroupUpdate, Group as GroupSchema, 
    GroupMember as GroupMemberSchema
)
from app.routers.auth import _get_user_from_token

router = APIRouter(prefix="/groups", tags=["groups"])

def generate_group_id(name: str) -> str:
    """Generate a unique group ID from the group name"""
    # Convert name to lowercase, replace spaces with hyphens, remove special chars
    base_id = ''.join(c.lower() if c.isalnum() or c == ' ' else '' for c in name)
    base_id = base_id.replace(' ', '-')
    
    # Add random suffix to ensure uniqueness
    suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6))
    return f"{base_id}-{suffix}"

@router.post("", response_model=GroupSchema, status_code=status.HTTP_201_CREATED)
def create_group(
    group_data: GroupCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Create a new study group"""
    
    # Generate unique group ID
    group_id = generate_group_id(group_data.name)
    
    # Check if group ID already exists (very unlikely but possible)
    existing = session.exec(select(Group).where(Group.id == group_id)).first()
    if existing:
        # Add timestamp to make it unique
        group_id = f"{group_id}-{int(datetime.utcnow().timestamp())}"
    
    # Create the group
    group = Group(
        id=group_id,
        name=group_data.name,
        field=group_data.field,
        exam=group_data.exam,
        description=group_data.description,
        cover_image_url=group_data.cover_image_url,
        deadline=group_data.deadline,
        capacity=group_data.capacity,
        created_by=current_user.id
    )
    
    session.add(group)
    session.commit()
    session.refresh(group)
    
    # Add creator as group leader
    group_member = GroupMember(
        group_id=group_id,
        user_id=current_user.id,
        is_leader=True
    )
    session.add(group_member)
    
    # Update member count
    group.members = 1
    session.add(group)
    session.commit()
    session.refresh(group)
    
    return group

@router.get("", response_model=List[GroupSchema])
def list_groups(
    field: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session)
):
    """List groups with optional filtering"""
    
    query = select(Group)
    
    if field:
        query = query.where(Group.field.ilike(f"%{field}%"))
    
    if q:
        like = f"%{q}%"
        query = query.where(
            (Group.name.ilike(like)) |
            (Group.description.ilike(like)) |
            (Group.exam.ilike(like))
        )
    
    query = query.offset(offset).limit(limit).order_by(Group.created_at.desc())
    
    groups = session.exec(query).all()
    return groups

@router.get("/autocomplete")
def autocomplete_groups(
    q: str = Query("", min_length=1),
    limit: int = Query(8, le=20),
    session: Session = Depends(get_session)
):
    """Autocomplete groups by name"""
    query = select(Group.name, Group.id, Group.field, Group.exam).where(
        Group.name.ilike(f"%{q}%")
    ).limit(limit)
    
    groups = session.exec(query).all()
    return [
        {
            "id": group.id,
            "name": group.name,
            "field": group.field,
            "exam": group.exam,
            "full": f"{group.name} - {group.field}" if group.field else group.name
        }
        for group in groups
    ]

@router.get("/{group_id}", response_model=GroupSchema)
def get_group(
    group_id: str,
    session: Session = Depends(get_session)
):
    """Get a specific group by ID"""
    
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    return group

@router.put("/{group_id}", response_model=GroupSchema)
def update_group(
    group_id: str,
    group_data: GroupUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Update a group (only by group leader)"""
    
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if user is group leader
    membership = session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
            GroupMember.is_leader == True
        )
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group leaders can update groups"
        )
    
    # Update fields
    update_data = group_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(group, field, value)
    
    session.add(group)
    session.commit()
    session.refresh(group)
    
    return group

@router.post("/{group_id}/join")
def join_group(
    group_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Join a group"""
    
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if group is full
    if group.members >= group.capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group is at maximum capacity"
        )
    
    # Check if user is already a member
    existing_membership = session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        )
    ).first()
    
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a member of this group"
        )
    
    # Add user to group
    group_member = GroupMember(
        group_id=group_id,
        user_id=current_user.id,
        is_leader=False
    )
    session.add(group_member)
    
    # Update member count
    group.members += 1
    session.add(group)
    session.commit()
    
    return {"message": "Successfully joined group"}

@router.delete("/{group_id}/leave")
def leave_group(
    group_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Leave a group"""
    
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Find membership
    membership = session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        )
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not a member of this group"
        )
    
    # Check if user is the only leader
    if membership.is_leader:
        other_leaders = session.exec(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.is_leader == True,
                GroupMember.user_id != current_user.id
            )
        ).first()
        
        if not other_leaders:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot leave group as the only leader. Transfer leadership first."
            )
    
    # Remove membership
    session.delete(membership)
    
    # Update member count
    group.members -= 1
    session.add(group)
    session.commit()
    
    return {"message": "Successfully left group"}

@router.delete("/{group_id}")
def delete_group(
    group_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Delete a group (only by group creator)"""
    
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if user is the group creator
    if group.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group creator can delete the group"
        )
    
    # Delete all related records first (due to foreign key constraints)
    # Delete group members
    members = session.exec(select(GroupMember).where(GroupMember.group_id == group_id)).all()
    for member in members:
        session.delete(member)
    
    # Finally delete the group
    session.delete(group)
    session.commit()
    
    return {"message": "Group deleted successfully"}

@router.get("/{group_id}/members", response_model=List[GroupMemberSchema])
def get_group_members(
    group_id: str,
    session: Session = Depends(get_session)
):
    """Get all members of a group"""
    
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    members = session.exec(
        select(GroupMember).where(GroupMember.group_id == group_id)
    ).all()
    
    return members

@router.get("/{group_id}/membership")
def check_membership(
    group_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Check if current user is a member of the group"""
    
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    membership = session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        )
    ).first()
    
    return {
        "is_member": membership is not None,
        "is_leader": membership.is_leader if membership else False,
        "joined_at": membership.joined_at if membership else None
    }
