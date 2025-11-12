from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from app.db import get_session
from app.models import MissionSubmission, Group, GroupMember, User
from app.schemas.groups import MissionSubmission as MissionSubmissionSchema
from app.routers.auth import _get_user_from_token
from app.routers.badges import award_xp_for_submission
from app.core.security import decode_token
from pydantic import BaseModel, Field

router = APIRouter(prefix="/groups/{group_id}/missions", tags=["missions"])

class MissionSubmissionCreate(BaseModel):
    submission_url: str = Field(..., description="URL to video/proof of mission completion")
    submission_text: Optional[str] = Field(None, max_length=1000, description="Optional text description")

class MissionSubmissionUpdate(BaseModel):
    is_approved: Optional[bool] = None
    score: Optional[int] = Field(None, ge=0, le=100, description="Score from 0-100")
    feedback: Optional[str] = Field(None, max_length=500, description="Feedback for the submission")

@router.post("", response_model=MissionSubmissionSchema, status_code=status.HTTP_201_CREATED)
def submit_mission(
    group_id: str,
    submission_data: MissionSubmissionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Submit a mission completion for a group"""
    
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
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of the group to submit missions"
        )
    
    existing = session.exec(
        select(MissionSubmission).where(
            MissionSubmission.group_id == group_id,
            MissionSubmission.user_id == current_user.id,
            MissionSubmission.is_approved == False
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending submission. Please wait for it to be reviewed."
        )
    
    submission = MissionSubmission(
        group_id=group_id,
        user_id=current_user.id,
        submission_url=submission_data.submission_url,
        submission_text=submission_data.submission_text,
        is_approved=False
    )
    
    session.add(submission)
    session.commit()
    session.refresh(submission)
    
    return submission

@router.get("", response_model=List[MissionSubmissionSchema])
def list_submissions(
    group_id: str,
    session: Session = Depends(get_session),
    authorization: Optional[str] = Header(default=None)
):
    """List all mission submissions for a group"""
    
    current_user = None
    try:
        if authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1].strip()
            payload = decode_token(token)
            user_id = int(payload.get("sub"))
            current_user = session.exec(select(User).where(User.id == user_id)).first()
    except:
        pass
    
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    is_leader = False
    if current_user:
        membership = session.exec(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user.id,
                GroupMember.is_leader == True
            )
        ).first()
        is_leader = membership is not None
    
    query = select(MissionSubmission).where(MissionSubmission.group_id == group_id)
    if not is_leader:
        query = query.where(MissionSubmission.is_approved == True)
    
    query = query.order_by(MissionSubmission.submitted_at.desc())
    submissions = session.exec(query).all()
    
    return submissions

@router.get("/my-submissions", response_model=List[MissionSubmissionSchema])
def get_my_submissions(
    group_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Get current user's submissions for a group"""
    
    group = session.exec(select(Group).where(Group.id == group_id)).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    submissions = session.exec(
        select(MissionSubmission).where(
            MissionSubmission.group_id == group_id,
            MissionSubmission.user_id == current_user.id
        ).order_by(MissionSubmission.submitted_at.desc())
    ).all()
    
    return submissions

@router.patch("/{submission_id}", response_model=MissionSubmissionSchema)
def review_submission(
    group_id: str,
    submission_id: int,
    review_data: MissionSubmissionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Review a mission submission (approve/reject, add score and feedback) - only group leaders"""
    
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
            detail="Only group leaders can review submissions"
        )
    
    submission = session.exec(
        select(MissionSubmission).where(
            MissionSubmission.id == submission_id,
            MissionSubmission.group_id == group_id
        )
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    if review_data.is_approved is not None:
        was_approved = submission.is_approved
        submission.is_approved = review_data.is_approved
        if review_data.is_approved:
            submission.approved_by = current_user.id
            submission.approved_at = datetime.utcnow()
            if not was_approved:
                award_xp_for_submission(submission.user_id, session)
        else:
            submission.approved_by = None
            submission.approved_at = None
    
    if review_data.score is not None:
        submission.score = review_data.score
    
    if review_data.feedback is not None:
        submission.feedback = review_data.feedback
    
    session.add(submission)
    session.commit()
    session.refresh(submission)
    
    return submission

@router.delete("/{submission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_submission(
    group_id: str,
    submission_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_user_from_token)
):
    """Delete a mission submission - only the submitter or group leader"""
    
    submission = session.exec(
        select(MissionSubmission).where(
            MissionSubmission.id == submission_id,
            MissionSubmission.group_id == group_id
        )
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    is_submitter = submission.user_id == current_user.id
    
    is_leader = False
    if not is_submitter:
        membership = session.exec(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user.id,
                GroupMember.is_leader == True
            )
        ).first()
        is_leader = membership is not None
    
    if not is_submitter and not is_leader:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own submissions, or you must be a group leader"
        )
    
    session.delete(submission)
    session.commit()
    
    return None

