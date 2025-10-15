from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from typing import List, Optional
from datetime import datetime
import secrets
import string

from app.db import get_session
from app.models import Group, GroupMember, MissionSubmission, Badge, User, MissionStatus
from app.schemas.groups import (
    GroupCreate, GroupUpdate, Group as GroupSchema, 
    GroupMember as GroupMemberSchema, MissionSubmission as MissionSubmissionSchema,
    Badge as BadgeSchema, LeaderboardEntry
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
    """Create a new group with optional mission"""
    
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
        created_by=current_user.id,
        mission_title=group_data.mission_title,
        mission_description=group_data.mission_description,
        mission_deadline=group_data.mission_deadline,
        mission_capacity=group_data.mission_capacity,
        mission_badge_name=group_data.mission_badge_name,
        mission_badge_description=group_data.mission_badge_description,
        mission_status=MissionStatus.active
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
    status_filter: Optional[MissionStatus] = None,
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session)
):
    """List groups with optional filtering"""
    
    query = select(Group)
    
    if field:
        query = query.where(Group.field.ilike(f"%{field}%"))
    
    if status_filter:
        query = query.where(Group.mission_status == status_filter)
    
    query = query.offset(offset).limit(limit).order_by(Group.created_at.desc())
    
    groups = session.exec(query).all()
    return groups

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
    if group.members >= group.mission_capacity:
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
    session.exec(select(GroupMember).where(GroupMember.group_id == group_id))
    members = session.exec(select(GroupMember).where(GroupMember.group_id == group_id)).all()
    for member in members:
        session.delete(member)
    
    # Delete mission submissions
    submissions = session.exec(select(MissionSubmission).where(MissionSubmission.group_id == group_id)).all()
    for submission in submissions:
        session.delete(submission)
    
    # Delete badges associated with this group
    badges = session.exec(select(Badge).where(Badge.group_id == group_id)).all()
    for badge in badges:
        session.delete(badge)
    
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

@router.get("/{group_id}/leaderboard", response_model=List[LeaderboardEntry])
def get_leaderboard(
    group_id: str,
    session: Session = Depends(get_session)
):
    """Get leaderboard for a group's mission"""
    
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    if not group.mission_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This group has no active mission"
        )
    
    # Get approved submissions with scores, ordered by score desc
    submissions = session.exec(
        select(MissionSubmission, User.email)
        .join(User, MissionSubmission.user_id == User.id)
        .where(
            MissionSubmission.group_id == group_id,
            MissionSubmission.is_approved == True,
            MissionSubmission.score.isnot(None)
        )
        .order_by(MissionSubmission.score.desc(), MissionSubmission.submitted_at.asc())
    ).all()
    
    leaderboard = []
    for i, (submission, user_email) in enumerate(submissions, 1):
        leaderboard.append(LeaderboardEntry(
            user_id=submission.user_id,
            user_email=user_email,
            score=submission.score,
            rank=i,
            submission_id=submission.id,
            submitted_at=submission.submitted_at,
            is_approved=submission.is_approved
        ))
    
    return leaderboard
