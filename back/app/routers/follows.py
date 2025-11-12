from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from typing import List
from app.db import get_session
from app.models import Follow, User
from app.routers.auth import _get_user_from_token

router = APIRouter(prefix="/follows", tags=["follows"])

@router.post("/{user_id}")
def follow_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Follow a user"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Check if user exists
    target_user = session.exec(select(User).where(User.id == user_id)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already following
    existing = session.exec(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already following this user")
    
    # Create follow relationship
    follow = Follow(follower_id=current_user.id, following_id=user_id)
    session.add(follow)
    session.commit()
    session.refresh(follow)
    
    return {"message": "Successfully followed user", "following": True}

@router.delete("/{user_id}")
def unfollow_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Unfollow a user"""
    follow = session.exec(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id
        )
    ).first()
    
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this user")
    
    session.delete(follow)
    session.commit()
    
    return {"message": "Successfully unfollowed user", "following": False}

@router.get("/{user_id}/status")
def get_follow_status(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Check if current user is following a specific user"""
    follow = session.exec(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id
        )
    ).first()
    
    return {"following": follow is not None}

@router.get("/{user_id}/followers")
def get_followers(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Get list of users following a specific user"""
    # Check if user exists
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get followers
    follows = session.exec(
        select(Follow).where(Follow.following_id == user_id)
    ).all()
    
    follower_ids = [f.follower_id for f in follows]
    if not follower_ids:
        return {"followers": [], "count": 0}
    
    followers = session.exec(
        select(User).where(User.id.in_(follower_ids))
    ).all()
    
    return {
        "followers": [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "photo_url": u.photo_url,
                "bio": u.bio
            }
            for u in followers
        ],
        "count": len(followers)
    }

@router.get("/{user_id}/following")
def get_following(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Get list of users that a specific user is following"""
    # Check if user exists
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get following
    follows = session.exec(
        select(Follow).where(Follow.follower_id == user_id)
    ).all()
    
    following_ids = [f.following_id for f in follows]
    if not following_ids:
        return {"following": [], "count": 0}
    
    following = session.exec(
        select(User).where(User.id.in_(following_ids))
    ).all()
    
    return {
        "following": [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "photo_url": u.photo_url,
                "bio": u.bio
            }
            for u in following
        ],
        "count": len(following)
    }

@router.get("/{user_id}/counts")
def get_follow_counts(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Get follower and following counts for a user"""
    # Check if user exists
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    followers_count = session.exec(
        select(func.count(Follow.id)).where(Follow.following_id == user_id)
    ).one()
    
    following_count = session.exec(
        select(func.count(Follow.id)).where(Follow.follower_id == user_id)
    ).one()
    
    return {
        "followers_count": followers_count or 0,
        "following_count": following_count or 0
    }

