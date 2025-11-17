from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select, func
from typing import List, Optional, Dict
from datetime import datetime, timezone
import secrets
import string
from collections import defaultdict, Counter

from app.db import get_session
from app.models import Group, GroupMember, User, MissionSubmission, GroupMessage, MessageRead
from app.schemas.groups import (
    GroupCreate, GroupUpdate, Group as GroupSchema, 
    GroupMember as GroupMemberSchema, GroupMemberWithUser
)
from app.routers.auth import _get_user_from_token, _get_optional_user_from_token
from app.services.ai import generate_image
from app.services.message_sync import MessageSynchronizer, MessageVersion, get_synchronizer
from pydantic import BaseModel

router = APIRouter(prefix="/groups", tags=["groups"])

# In-memory storage for typing indicators (group_id -> {user_id: last_typing_timestamp})
# In production, use Redis or similar for distributed systems
typing_status: Dict[str, Dict[int, datetime]] = defaultdict(dict)

# In-memory storage for user presence (user_id -> last_activity_timestamp)
# Users are considered "online" if they've been active in the last 5 minutes
user_presence: Dict[int, datetime] = {}
PRESENCE_TIMEOUT_SECONDS = 300  # 5 minutes

# WebSocket connections for group chat (group_id -> {user_id: WebSocket})
group_connections: Dict[str, Dict[int, WebSocket]] = {}

# Store reference to the main event loop for broadcasting from sync endpoints
_main_event_loop = None

def set_main_event_loop(loop):
    """Set the main event loop reference"""
    global _main_event_loop
    _main_event_loop = loop

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
    
    # Require minimum XP to create groups (ensures graders have platform experience)
    MIN_XP_TO_CREATE_GROUP = 250
    user_xp = current_user.xp or 0
    if user_xp < MIN_XP_TO_CREATE_GROUP:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You need at least {MIN_XP_TO_CREATE_GROUP} XP to create a group. You currently have {user_xp} XP. Earn XP by submitting tasks, attending events, and participating in groups!"
        )
    
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

@router.get("")
def list_groups(
    field: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(_get_optional_user_from_token)
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
    
    # If user is authenticated, enrich groups with join status and member counts
    if current_user:
        group_ids = [g.id for g in groups]
        if group_ids:
            # Get all member counts in one query
            all_members = session.exec(
                select(GroupMember.group_id)
                .where(GroupMember.group_id.in_(group_ids))
            ).all()
            count_map = dict(Counter(all_members))
            
            # Get user's joined groups in one query
            user_joined_groups = session.exec(
                select(GroupMember.group_id).where(
                    GroupMember.group_id.in_(group_ids),
                    GroupMember.user_id == current_user.id
                )
            ).all()
            joined_set = set(user_joined_groups)
            
            # Enrich groups with additional data
            result = []
            for group in groups:
                group_dict = group.model_dump()
                group_dict["member_count"] = count_map.get(group.id, 0)
                group_dict["is_joined"] = (
                    group.created_by == current_user.id or 
                    group.id in joined_set
                )
                result.append(group_dict)
            return result
    
    # If not authenticated, return groups as-is
    return [g.model_dump() for g in groups]

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

@router.get("/my-groups/count")
def get_my_groups_count(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Get count of groups that the current user is a member of or created (lightweight)"""
    from sqlmodel import or_
    
    # Get group IDs user is a member of
    member_group_ids = session.exec(
        select(GroupMember.group_id).where(GroupMember.user_id == current_user.id)
    ).all()
    
    # Build query - handle empty list case
    if not member_group_ids:
        # Only created groups
        query = select(func.count(Group.id)).where(Group.created_by == current_user.id)
    else:
        # Groups user is member of OR created
        query = select(func.count(Group.id)).where(
            or_(
                Group.id.in_(member_group_ids),
                Group.created_by == current_user.id
            )
        )
    
    count = session.exec(query).one() or 0
    return {"count": count}

@router.get("/my-groups", response_model=List[GroupSchema])
def get_my_groups(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get groups that the current user is a member of or created (paginated)"""
    from sqlmodel import or_
    
    # Get group IDs user is a member of
    member_group_ids = session.exec(
        select(GroupMember.group_id).where(GroupMember.user_id == current_user.id)
    ).all()
    
    # Build query - handle empty list case
    if not member_group_ids:
        # Only created groups
        query = select(Group).where(Group.created_by == current_user.id)
    else:
        # Groups user is member of OR created
        query = select(Group).where(
            or_(
                Group.id.in_(member_group_ids),
                Group.created_by == current_user.id
            )
        )
    
    query = query.order_by(Group.created_at.desc()).limit(limit).offset(offset)
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
        # Already joined - return current count
        member_count = session.exec(
            select(func.count()).select_from(GroupMember).where(GroupMember.group_id == group_id)
        ).one()
        return {"success": True, "alreadyJoined": True, "member_count": member_count}
    
    
    group_member = GroupMember(
        group_id=group_id,
        user_id=current_user.id,
        is_leader=False
    )
    session.add(group_member)
    
    
    group.members += 1
    session.add(group)
    session.commit()
    session.refresh(group)
    
    # Get actual member count from database
    member_count = session.exec(
        select(func.count()).select_from(GroupMember).where(GroupMember.group_id == group_id)
    ).one()
    
    # Update user presence when joining
    user_presence[current_user.id] = datetime.now(timezone.utc)
    
    return {"success": True, "member_count": member_count}

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
        # Not joined - return current count
        member_count = session.exec(
            select(func.count()).select_from(GroupMember).where(GroupMember.group_id == group_id)
        ).one()
        return {"success": True, "notJoined": True, "member_count": member_count}
    
    
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
    session.refresh(group)
    
    # Get actual member count from database
    member_count = session.exec(
        select(func.count()).select_from(GroupMember).where(GroupMember.group_id == group_id)
    ).one()
    
    return {"success": True, "member_count": member_count}

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
    
    user_ids = [m.user_id for m in members]
    if user_ids:
        users = session.exec(select(User).where(User.id.in_(user_ids))).all()
        user_map = {u.id: u for u in users}
        
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
                user_name=user.name if user else None,
                user_photo_url=user.photo_url if user else None,
                user_is_verified=user.is_verified if user else None
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

@router.get("/{group_id}/messages")
def get_group_messages(
    group_id: str, 
    session: Session = Depends(get_session), 
    current_user: Optional[User] = Depends(_get_optional_user_from_token),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Get messages for a group (paginated, most recent first)"""
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Optimized: Load messages with limit, order by desc (newest first) for pagination
    messages = session.exec(
        select(GroupMessage)
        .where(GroupMessage.group_id == group_id)
        .order_by(GroupMessage.created_at.desc())
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
            MessageRead.message_type == "group"
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

@router.post("/{group_id}/messages")
def post_group_message(
    group_id: str,
    content: str = Query(..., min_length=1, max_length=1000),
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Post a message to a group chat"""
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is a member or the group owner
    is_member = session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        )
    ).first()
    
    is_owner = group.created_by == current_user.id
    
    if not is_member and not is_owner:
        raise HTTPException(status_code=403, detail="You must be a member or group owner to post messages")
    
    # Update user presence
    user_presence[current_user.id] = datetime.now(timezone.utc)
    
    message = GroupMessage(
        group_id=group_id,
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

@router.post("/{group_id}/typing")
def set_group_typing_status(
    group_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Indicate that the current user is typing in the group chat"""
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is a member or the group owner
    is_member = session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        )
    ).first()
    
    is_owner = group.created_by == current_user.id
    
    if not is_member and not is_owner:
        raise HTTPException(status_code=403, detail="You must be a member or group owner")
    
    # Update typing status (expires after 3 seconds of inactivity)
    typing_status[group_id][current_user.id] = datetime.now(timezone.utc)
    
    # Update user presence
    user_presence[current_user.id] = datetime.now(timezone.utc)
    
    return {"status": "typing"}

@router.get("/{group_id}/typing")
def get_group_typing_status(
    group_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(_get_optional_user_from_token)
):
    """Get list of users currently typing in the group chat"""
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Clean up expired typing statuses (older than 3 seconds)
    now = datetime.now(timezone.utc)
    expired_users = []
    if group_id in typing_status:
        for user_id, last_typing in list(typing_status[group_id].items()):
            if (now - last_typing).total_seconds() > 3:
                expired_users.append(user_id)
        for user_id in expired_users:
            del typing_status[group_id][user_id]
    
    # Get currently typing users (excluding current user)
    typing_user_ids = [
        uid for uid in typing_status.get(group_id, {}).keys()
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

@router.get("/{group_id}/presence")
def get_group_presence(
    group_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(_get_optional_user_from_token)
):
    """Get online/offline status for all members of a group"""
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get all members
    members = session.exec(
        select(GroupMember).where(GroupMember.group_id == group_id)
    ).all()
    
    # Also include the group owner
    member_user_ids = [m.user_id for m in members]
    if group.created_by not in member_user_ids:
        member_user_ids.append(group.created_by)
    
    # If authenticated user is viewing the page and is a member/owner, update their presence
    if current_user and current_user.id in member_user_ids:
        user_presence[current_user.id] = datetime.now(timezone.utc)
    
    if not member_user_ids:
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
    users = session.exec(select(User).where(User.id.in_(member_user_ids))).all()
    
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

@router.delete("/{group_id}/messages/{message_id}")
def delete_group_message(
    group_id: str,
    message_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Delete a message from a group chat (only by message author) - soft delete"""
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    message = session.get(GroupMessage, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message.group_id != group_id:
        raise HTTPException(status_code=400, detail="Message does not belong to this group")
    
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
                    broadcast_to_group(group_id, None, {
                        "type": "message_deleted",
                        "message_id": message_id
                    }),
                    loop
                )
            elif loop:
                # If loop exists but not running, run it directly
                loop.run_until_complete(broadcast_to_group(group_id, None, {
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

@router.post("/{group_id}/messages/{message_id}/read")
def mark_group_message_read(
    group_id: str,
    message_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Mark a message as read by the current user"""
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    message = session.get(GroupMessage, message_id)
    if not message or message.group_id != group_id:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if already read
    existing_read = session.exec(
        select(MessageRead).where(
            MessageRead.message_id == message_id,
            MessageRead.message_type == "group",
            MessageRead.user_id == current_user.id
        )
    ).first()
    
    if not existing_read:
        read_record = MessageRead(
            message_id=message_id,
            message_type="group",
            user_id=current_user.id
        )
        session.add(read_record)
        session.commit()
    
    return {"status": "read"}


# WebSocket endpoint for real-time group chat
@router.websocket("/{group_id}/ws")
async def group_chat_websocket(websocket: WebSocket, group_id: str):
    """WebSocket endpoint for real-time group chat"""
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
    
    # Verify group exists and user has access
    session_gen = get_session()
    try:
        session = next(session_gen)
        group = session.exec(select(Group).where(Group.id == group_id)).first()
        if not group:
            await websocket.close(code=1008, reason="Group not found")
            return
        
        # Check if user is a member or owner
        is_member = session.exec(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id
            )
        ).first()
        is_owner = group.created_by == user_id
        
        if not is_member and not is_owner:
            await websocket.close(code=1008, reason="Access denied")
            return
        
        # Initialize connection storage
        if group_id not in group_connections:
            group_connections[group_id] = {}
        
        # Add connection
        group_connections[group_id][user_id] = websocket
        
        # Update presence
        user_presence[user_id] = datetime.now(timezone.utc)
        
        # Get message synchronizer for this group
        synchronizer = get_synchronizer(group_id, "group")
        
        # Load messages from database and sync with synchronizer
        messages = session.exec(
            select(GroupMessage).where(GroupMessage.group_id == group_id)
            .order_by(GroupMessage.created_at.desc())
            .limit(50)
        ).all()
        
        # Initialize message versions in synchronizer (for existing messages)
        # Process in chronological order to build vector clocks correctly
        try:
            sorted_messages = sorted(messages, key=lambda m: m.created_at)
            for msg in sorted_messages:
                try:
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
                except Exception as e:
                    print(f"Error initializing message version for message {msg.id}: {e}")
                    continue
            
            # Get causally ordered messages from synchronizer
            try:
                ordered_versions = synchronizer.get_ordered_messages(limit=50)
            except Exception as e:
                print(f"Error getting ordered messages: {e}")
                # Fallback to simple chronological order
                ordered_versions = []
                for msg in sorted_messages:
                    try:
                        created_at = msg.created_at
                        if created_at.tzinfo is None:
                            created_at = created_at.replace(tzinfo=timezone.utc)
                        version = MessageVersion(
                            message_id=msg.id,
                            vector_clock={},
                            content=msg.content if not msg.is_deleted else "",
                            user_id=msg.user_id,
                            created_at=created_at
                        )
                        ordered_versions.append(version)
                    except:
                        continue
        except Exception as e:
            print(f"Error in message synchronization: {e}")
            import traceback
            traceback.print_exc()
            # Fallback: use messages as-is
            ordered_versions = []
            for msg in reversed(messages):
                try:
                    created_at = msg.created_at
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    version = MessageVersion(
                        message_id=msg.id,
                        vector_clock={},
                        content=msg.content if not msg.is_deleted else "",
                        user_id=msg.user_id,
                        created_at=created_at
                    )
                    ordered_versions.append(version)
                except:
                    continue
        
        # Convert to message list format
        messages_list = []
        for msg_version in ordered_versions:
            try:
                msg = session.get(GroupMessage, msg_version.message_id)
                if not msg:
                    continue
                    
                msg_user = session.get(User, msg.user_id)
                created_at_str = msg.created_at.isoformat()
                if msg.created_at.tzinfo is None:
                    created_at_str = msg.created_at.replace(tzinfo=timezone.utc).isoformat()
                if not created_at_str.endswith('Z') and msg.created_at.tzinfo == timezone.utc:
                    created_at_str = created_at_str.replace('+00:00', 'Z')
                
                messages_list.append({
                    "id": msg.id,
                    "content": msg.content if not msg.is_deleted else "",
                    "is_deleted": msg.is_deleted,
                    "created_at": created_at_str,
                    "vector_clock": msg_version.vector_clock if hasattr(msg_version, 'vector_clock') else {},  # Include vector clock
                    "version": msg_version.version if hasattr(msg_version, 'version') else 0,
                    "user": {
                        "id": msg_user.id if msg_user else user_id,
                        "name": msg_user.name if msg_user else "Unknown",
                        "email": msg_user.email if msg_user else "",
                        "photo_url": msg_user.photo_url if msg_user else None,
                        "is_verified": msg_user.is_verified if msg_user else False
                    }
                })
            except Exception as e:
                print(f"Error processing message version: {e}")
                continue
        
        try:
            await websocket.send_json({
                "type": "initial_messages",
                "messages": messages_list
            })
        except Exception as e:
            print(f"Error sending initial messages: {e}")
            import traceback
            traceback.print_exc()
            await websocket.close(code=1011, reason="Failed to send initial messages")
            return
        
        # Broadcast user joined
        try:
            await broadcast_to_group(group_id, user_id, {
                "type": "user_joined",
                "user_id": user_id,
                "user_name": user_name,
                "user_photo_url": user_photo_url
            })
        except Exception as e:
            print(f"Error broadcasting user joined: {e}")
            # Don't close connection for this
        
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
                            synchronizer = get_synchronizer(group_id, "group")
                            try:
                                created_at_str = incoming_msg.get("created_at", "")
                                if created_at_str.endswith('Z'):
                                    created_at_str = created_at_str.replace('Z', '+00:00')
                                created_at = datetime.fromisoformat(created_at_str)
                                msg_version = MessageVersion(
                                    message_id=incoming_msg.get("id"),
                                    vector_clock=incoming_msg.get("vector_clock", {}),
                                    content=incoming_msg.get("content", ""),
                                    user_id=incoming_msg.get("user_id"),
                                    created_at=created_at
                                )
                                is_new, merged = synchronizer.merge_message(msg_version)
                                if is_new:
                                    # Broadcast the merged message
                                    await broadcast_to_group(group_id, user_id, {
                                        "type": "new_message",
                                        "message": incoming_msg
                                    })
                            except Exception as e:
                                print(f"Error processing sync_message: {e}")
                        continue
                    
                    if message_type == "message":
                        # Send a new message
                        content = data.get("content", "").strip()
                        if not content or len(content) > 1000:
                            continue
                        
                        # Get synchronizer for this group
                        synchronizer = get_synchronizer(group_id, "group")
                        
                        # Create message in database
                        # Use a new session for each database operation to avoid session issues
                        try:
                            message = GroupMessage(
                                group_id=group_id,
                                user_id=user_id,
                                content=content
                            )
                            session.add(message)
                            session.commit()
                            session.refresh(message)
                        except Exception as e:
                            print(f"Error creating message in database: {e}")
                            import traceback
                            traceback.print_exc()
                            continue
                        
                        # Create message version with vector clock
                        try:
                            created_at = message.created_at
                            if created_at.tzinfo is None:
                                created_at = created_at.replace(tzinfo=timezone.utc)
                            
                            msg_version = synchronizer.create_message_version(
                                message_id=message.id,
                                user_id=user_id,
                                content=content,
                                created_at=created_at
                            )
                        except Exception as e:
                            print(f"Error creating message version: {e}")
                            # Fallback: create a simple version without vector clock
                            msg_version = type('obj', (object,), {
                                'vector_clock': {},
                                'version': 0
                            })()
                        
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
                        await broadcast_to_group(group_id, None, {
                            "type": "new_message",
                            "message": {
                                "id": message.id,
                                "content": message.content,
                                "is_deleted": False,
                                "created_at": created_at_str,
                                "vector_clock": msg_version.vector_clock,  # Include vector clock
                                "version": msg_version.version,
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
                        typing_status[group_id][user_id] = datetime.now(timezone.utc)
                        user_presence[user_id] = datetime.now(timezone.utc)
                        
                        # Broadcast typing indicator
                        await broadcast_to_group(group_id, user_id, {
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
                        if group_id in group_connections:
                            for uid in group_connections[group_id].keys():
                                if uid != user_id and uid in user_presence:
                                    if (now - user_presence[uid]).total_seconds() < PRESENCE_TIMEOUT_SECONDS:
                                        online_users.append(uid)
                        
                        await websocket.send_json({
                            "type": "presence_update",
                            "online_users": online_users
                        })
                
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
            if group_id in group_connections and user_id in group_connections[group_id]:
                del group_connections[group_id][user_id]
            
            # Broadcast user left
            try:
                await broadcast_to_group(group_id, user_id, {
                    "type": "user_left",
                    "user_id": user_id
                })
            except Exception as e:
                print(f"Error broadcasting user left: {e}")
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

async def broadcast_to_group(group_id: str, exclude_user_id: Optional[int], message: Dict):
    """Broadcast message to all connected users in a group"""
    if group_id not in group_connections:
        return
    
    disconnected = []
    for user_id, ws in group_connections[group_id].items():
        if exclude_user_id is None or user_id != exclude_user_id:
            try:
                await ws.send_json(message)
            except:
                disconnected.append(user_id)
    
    # Clean up disconnected users
    for user_id in disconnected:
        if group_id in group_connections and user_id in group_connections[group_id]:
            del group_connections[group_id][user_id]
