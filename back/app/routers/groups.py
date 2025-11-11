from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func
from typing import List, Optional
from datetime import datetime
import secrets
import string

from app.db import get_session
from app.models import Group, GroupMember, User, MissionSubmission
from app.schemas.groups import (
    GroupCreate, GroupUpdate, Group as GroupSchema, 
    GroupMember as GroupMemberSchema, GroupMemberWithUser, LeaderboardEntry
)
from app.routers.auth import _get_user_from_token

router = APIRouter(prefix="/groups", tags=["groups"])

def generate_group_id(name: str) -> str:
    """Generate a unique group ID from the group name"""
    
    base_id = ''.join(c.lower() if c.isalnum() or c == ' ' else '' for c in name)
    base_id = base_id.replace(' ', '-')
    
    
    suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6))
    return f"{base_id}-{suffix}"

@router.post("", response_model=GroupSchema, status_code=status.HTTP_201_CREATED)
def create_group(
    group_data: GroupCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Create a new study group"""
    
    group_id = generate_group_id(group_data.name)
    
    
    existing = session.exec(select(Group).where(Group.id == group_id)).first()
    if existing:
        
        group_id = f"{group_id}-{int(datetime.utcnow().timestamp())}"
    
    
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
    
    
    group_member = GroupMember(
        group_id=group_id,
        user_id=current_user.id,
        is_leader=True
    )
    session.add(group_member)
    
    
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
    
    
    if group.members >= group.capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group is at maximum capacity"
        )
    
    
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
    
    
    group_member = GroupMember(
        group_id=group_id,
        user_id=current_user.id,
        is_leader=False
    )
    session.add(group_member)
    
    
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
    
    
    session.delete(membership)
    
    
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
    
    
    if group.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group creator can delete the group"
        )
    
    
    
    members = session.exec(select(GroupMember).where(GroupMember.group_id == group_id)).all()
    for member in members:
        session.delete(member)
    
    
    session.delete(group)
    session.commit()
    
    return {"message": "Group deleted successfully"}

@router.get("/{group_id}/members", response_model=List[GroupMemberWithUser])
def get_group_members(
    group_id: str,
    session: Session = Depends(get_session)
):
    """Get all members of a group with user details"""
    
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    members = session.exec(
        select(GroupMember).where(GroupMember.group_id == group_id)
        .order_by(GroupMember.is_leader.desc(), GroupMember.joined_at.asc())
    ).all()
    
    # Get user details for each member
    user_ids = [m.user_id for m in members]
    if user_ids:
        users = session.exec(select(User).where(User.id.in_(user_ids))).all()
        user_map = {u.id: u for u in users}
        
        # Combine member and user data
        result = []
        for member in members:
            user = user_map.get(member.user_id)
            result.append(GroupMemberWithUser(
                id=member.id,
                user_id=member.user_id,
                group_id=member.group_id,
                joined_at=member.joined_at,
                is_leader=member.is_leader,
                user_email=user.email if user else None,
                user_name=user.name if user else None
            ))
        return result
    
    return []

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

@router.get("/{group_id}/leaderboard", response_model=List[LeaderboardEntry])
def get_group_leaderboard(
    group_id: str,
    session: Session = Depends(get_session)
):
    """Get leaderboard for a group based on mission submissions"""
    
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Get all approved submissions for this group, ordered by score
    submissions = session.exec(
        select(MissionSubmission)
        .where(
            MissionSubmission.group_id == group_id,
            MissionSubmission.is_approved == True,
            MissionSubmission.score.isnot(None)
        )
        .order_by(MissionSubmission.score.desc(), MissionSubmission.submitted_at.asc())
    ).all()
    
    if not submissions:
        return []
    
    # Get user IDs and fetch users
    user_ids = list(set([s.user_id for s in submissions]))  # Remove duplicates
    if not user_ids:
        return []
    
    # Fetch users in batch
    users = session.exec(select(User).where(User.id.in_(user_ids))).all()
    user_map = {u.id: u for u in users}
    
    # Calculate scores and ranks
    leaderboard = []
    current_rank = 1
    previous_score = None
    
    for idx, submission in enumerate(submissions):
        user = user_map.get(submission.user_id)
        if not user:
            continue
        
        # Handle ties - same score gets same rank
        if previous_score is not None and submission.score != previous_score:
            current_rank = idx + 1
        
        previous_score = submission.score
        
        leaderboard.append(LeaderboardEntry(
            user_id=user.id,
            user_email=user.email,
            score=submission.score or 0,
            rank=current_rank,
            submission_id=submission.id,
            submitted_at=submission.submitted_at,
            is_approved=submission.is_approved
        ))
    
    return leaderboard
