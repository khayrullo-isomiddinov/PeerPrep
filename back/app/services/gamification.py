"""
Advanced Gamification Engine with Multi-Factor XP Calculation,
Engagement Prediction, and Dynamic Badge Unlocking Algorithms
"""
from typing import Optional
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select, func

from app.models import User, MissionSubmission, EventAttendee, Event, GroupMember
from app.config import settings


class EngagementPredictor:
    """ML-inspired engagement prediction using statistical models"""
    
    @staticmethod
    def calculate_engagement_score(user_id: int, session: Session) -> float:
        """
        Predict user engagement score (0-1) based on activity patterns
        Uses weighted factors: recency, frequency, diversity, consistency
        """
        now = datetime.now(timezone.utc)
        
        # Factor 1: Recency (recent activity = higher score)
        recent_submissions = session.exec(
            select(func.count(MissionSubmission.id)).where(
                MissionSubmission.user_id == user_id,
                MissionSubmission.is_approved == True,
                MissionSubmission.submitted_at > now - timedelta(days=7)
            )
        ).one() or 0
        
        recent_events = session.exec(
            select(func.count(EventAttendee.id)).where(
                EventAttendee.user_id == user_id,
                EventAttendee.joined_at > now - timedelta(days=7)
            )
        ).one() or 0
        
        recency_score = min(1.0, (recent_submissions * 0.1 + recent_events * 0.05))
        
        # Factor 2: Frequency (consistent activity)
        total_submissions = session.exec(
            select(func.count(MissionSubmission.id)).where(
                MissionSubmission.user_id == user_id,
                MissionSubmission.is_approved == True
            )
        ).one() or 0
        
        account_age_days = session.exec(
            select(User).where(User.id == user_id)
        ).first()
        if account_age_days and account_age_days.created_at:
            # Ensure both datetimes are timezone-aware for comparison
            created_at = account_age_days.created_at
            if created_at.tzinfo is None:
                # If naive, assume it's UTC
                created_at = created_at.replace(tzinfo=timezone.utc)
            age = (now - created_at).days or 1
            frequency_score = min(1.0, total_submissions / max(age, 1) * 7)  # submissions per week
        else:
            frequency_score = 0.0
        
        # Factor 3: Diversity (participating in multiple groups/events)
        unique_groups = session.exec(
            select(func.count(func.distinct(MissionSubmission.group_id))).where(
                MissionSubmission.user_id == user_id,
                MissionSubmission.is_approved == True
            )
        ).one() or 0
        
        unique_events = session.exec(
            select(func.count(func.distinct(EventAttendee.event_id))).where(
                EventAttendee.user_id == user_id
            )
        ).one() or 0
        
        diversity_score = min(1.0, (unique_groups + unique_events) / 10.0)
        
        # Factor 4: Consistency (streak calculation)
        streak_score = EngagementPredictor._calculate_streak(user_id, session)
        
        # Weighted combination
        engagement = (
            recency_score * 0.3 +
            frequency_score * 0.3 +
            diversity_score * 0.2 +
            streak_score * 0.2
        )
        
        return min(1.0, max(0.0, engagement))
    
    @staticmethod
    def _calculate_streak(user_id: int, session: Session) -> float:
        """Calculate activity streak (consecutive days with activity)"""
        now = datetime.now(timezone.utc)
        streak_days = 0
        
        for day_offset in range(30):  # Check last 30 days
            check_date = now - timedelta(days=day_offset)
            day_start = check_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            has_activity = (
                session.exec(
                    select(func.count(MissionSubmission.id)).where(
                        MissionSubmission.user_id == user_id,
                        MissionSubmission.is_approved == True,
                        MissionSubmission.submitted_at >= day_start,
                        MissionSubmission.submitted_at < day_end
                    )
                ).one() or 0
            ) > 0 or (
                session.exec(
                    select(func.count(EventAttendee.id)).where(
                        EventAttendee.user_id == user_id,
                        EventAttendee.joined_at >= day_start,
                        EventAttendee.joined_at < day_end
                    )
                ).one() or 0
            ) > 0
            
            if has_activity:
                streak_days += 1
            else:
                break
        
        return min(1.0, streak_days / 7.0)  # Normalize to 7-day streak = 1.0


class DynamicXPCalculator:
    """Multi-factor XP calculation with difficulty adjustment and bonuses"""
    
    BASE_XP_SUBMISSION = 50
    BASE_XP_EVENT = 30
    
    @staticmethod
    def calculate_submission_xp(user_id: int, submission_id: int, 
                                session: Session) -> int:
        """
        Calculate XP for a submission based on multiple factors:
        - Base XP
        - Difficulty multiplier (based on group activity)
        - Quality bonus (based on score)
        - Time bonus (submitted before deadline)
        - Engagement multiplier (active users get bonus)
        """
        submission = session.get(MissionSubmission, submission_id)
        if not submission:
            return 0
        
        base_xp = DynamicXPCalculator.BASE_XP_SUBMISSION
        
        # Factor 1: Difficulty multiplier (based on group size and activity)
        group_members = session.exec(
            select(func.count(GroupMember.id)).where(
                GroupMember.group_id == submission.group_id
            )
        ).one() or 1
        
        group_submissions = session.exec(
            select(func.count(MissionSubmission.id)).where(
                MissionSubmission.group_id == submission.group_id,
                MissionSubmission.is_approved == True
            )
        ).one() or 0
        
        # Larger, more active groups = higher difficulty = more XP
        difficulty_multiplier = 1.0 + min(0.5, (group_members / 20.0) * 0.3 + (group_submissions / 50.0) * 0.2)
        
        # Factor 2: Quality bonus (based on score)
        quality_multiplier = 1.0
        if submission.score is not None:
            # Score 0-100 maps to 0.8x - 1.5x multiplier
            quality_multiplier = 0.8 + (submission.score / 100.0) * 0.7
        
        # Factor 3: Time bonus (submitted early = bonus)
        time_bonus = 1.0
        # Note: We'd need mission deadline in Group model for this
        # For now, use submission recency as proxy
        if submission.submitted_at:
            # Ensure both datetimes are timezone-aware for comparison
            submitted_at = submission.submitted_at
            if submitted_at.tzinfo is None:
                # If naive, assume it's UTC
                submitted_at = submitted_at.replace(tzinfo=timezone.utc)
            days_ago = (datetime.now(timezone.utc) - submitted_at).days
            if days_ago < 1:
                time_bonus = 1.1  # 10% bonus for same-day submission
        
        # Factor 4: Engagement multiplier (active users get bonus)
        engagement = EngagementPredictor.calculate_engagement_score(user_id, session)
        engagement_multiplier = 1.0 + (engagement * 0.2)  # Up to 20% bonus
        
        # Calculate final XP
        final_xp = int(base_xp * difficulty_multiplier * quality_multiplier * 
                      time_bonus * engagement_multiplier)
        
        return max(base_xp, final_xp)  # At least base XP
    
    @staticmethod
    def calculate_event_xp(user_id: int, event_id: int, session: Session) -> int:
        """Calculate XP for event attendance with engagement multiplier"""
        base_xp = DynamicXPCalculator.BASE_XP_EVENT
        
        # Engagement multiplier
        engagement = EngagementPredictor.calculate_engagement_score(user_id, session)
        engagement_multiplier = 1.0 + (engagement * 0.15)
        
        return int(base_xp * engagement_multiplier)


class AdvancedBadgeSystem:
    """Complex badge unlocking with multi-dimensional requirements"""
    
    BADGE_REQUIREMENTS = [
        {
            "name": "Beginner",
            "min_xp": 0,
            "requirements": {"xp": 0},
            "icon": "🌱",
            "color": "green"
        },
        {
            "name": "Learner",
            "min_xp": 200,
            "requirements": {
                "xp": 200,
                "submissions": 2,
                "engagement": 0.3
            },
            "icon": "📚",
            "color": "blue"
        },
        {
            "name": "Achiever",
            "min_xp": 500,
            "requirements": {
                "xp": 500,
                "submissions": 5,
                "events": 3,
                "engagement": 0.5,
                "streak_days": 3
            },
            "icon": "⭐",
            "color": "purple"
        },
        {
            "name": "Expert",
            "min_xp": 1500,
            "requirements": {
                "xp": 1500,
                "submissions": 15,
                "events": 8,
                "engagement": 0.7,
                "streak_days": 7,
                "groups": 3
            },
            "icon": "🏆",
            "color": "orange"
        },
        {
            "name": "Master",
            "min_xp": 4000,
            "requirements": {
                "xp": 4000,
                "submissions": 40,
                "events": 20,
                "engagement": 0.9,
                "streak_days": 14,
                "groups": 5,
                "avg_score": 80
            },
            "icon": "👑",
            "color": "gold"
        }
    ]
    
    @staticmethod
    def check_badge_unlock(user_id: int, session: Session) -> Optional[dict]:
        """
        Check if user qualifies for a badge based on multi-dimensional requirements
        Returns the highest badge the user qualifies for
        """
        user = session.get(User, user_id)
        if not user:
            return None
        
        # Admin always gets Master badge
        if user.email == settings.ADMIN_EMAIL:
            return {
                "name": "Master",
                "min_xp": 4000,
                "requirements": {
                    "xp": 4000,
                    "submissions": 40,
                    "events": 20,
                    "engagement": 0.9,
                    "streak_days": 14,
                    "groups": 5,
                    "avg_score": 80
                },
                "icon": "👑",
                "color": "gold"
            }
        
        total_xp = user.xp or 0
        
        # Get user stats
        stats = AdvancedBadgeSystem._get_user_stats(user_id, session)
        
        # Check badges in reverse order (highest first)
        for badge in reversed(AdvancedBadgeSystem.BADGE_REQUIREMENTS):
            if AdvancedBadgeSystem._meets_requirements(badge, total_xp, stats):
                return badge
        
        return AdvancedBadgeSystem.BADGE_REQUIREMENTS[0]  # Beginner as default
    
    @staticmethod
    def _get_user_stats(user_id: int, session: Session) -> dict:
        """Get comprehensive user statistics"""
        total_submissions = session.exec(
            select(func.count(MissionSubmission.id)).where(
                MissionSubmission.user_id == user_id,
                MissionSubmission.is_approved == True
            )
        ).one() or 0
        
        total_events = session.exec(
            select(func.count(EventAttendee.id)).where(
                EventAttendee.user_id == user_id
            )
        ).one() or 0
        
        unique_groups = session.exec(
            select(func.count(func.distinct(MissionSubmission.group_id))).where(
                MissionSubmission.user_id == user_id,
                MissionSubmission.is_approved == True
            )
        ).one() or 0
        
        # Calculate average score
        avg_score_result = session.exec(
            select(func.avg(MissionSubmission.score)).where(
                MissionSubmission.user_id == user_id,
                MissionSubmission.is_approved == True,
                MissionSubmission.score.isnot(None)
            )
        ).one()
        avg_score = avg_score_result if avg_score_result else 0
        
        # Calculate engagement and streak
        engagement = EngagementPredictor.calculate_engagement_score(user_id, session)
        streak_days = AdvancedBadgeSystem._calculate_streak_days(user_id, session)
        
        return {
            "submissions": total_submissions,
            "events": total_events,
            "groups": unique_groups,
            "avg_score": avg_score,
            "engagement": engagement,
            "streak_days": streak_days
        }
    
    @staticmethod
    def _calculate_streak_days(user_id: int, session: Session) -> int:
        """Calculate current activity streak in days"""
        now = datetime.now(timezone.utc)
        streak = 0
        
        for day_offset in range(30):
            check_date = now - timedelta(days=day_offset)
            day_start = check_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            has_activity = (
                session.exec(
                    select(func.count(MissionSubmission.id)).where(
                        MissionSubmission.user_id == user_id,
                        MissionSubmission.is_approved == True,
                        MissionSubmission.submitted_at >= day_start,
                        MissionSubmission.submitted_at < day_end
                    )
                ).one() or 0
            ) > 0
            
            if has_activity:
                streak += 1
            else:
                break
        
        return streak
    
    @staticmethod
    def _meets_requirements(badge: dict, total_xp: int, stats: dict) -> bool:
        """Check if user meets all requirements for a badge"""
        reqs = badge.get("requirements", {})
        
        if total_xp < reqs.get("xp", 0):
            return False
        
        if stats["submissions"] < reqs.get("submissions", 0):
            return False
        
        if stats["events"] < reqs.get("events", 0):
            return False
        
        if stats["engagement"] < reqs.get("engagement", 0):
            return False
        
        if stats["streak_days"] < reqs.get("streak_days", 0):
            return False
        
        if stats["groups"] < reqs.get("groups", 0):
            return False
        
        if reqs.get("avg_score", 0) > 0 and stats["avg_score"] < reqs["avg_score"]:
            return False
        
        return True


def award_dynamic_xp_for_submission(user_id: int, submission_id: int, session: Session) -> int:
    """Award dynamically calculated XP for submission"""
    xp = DynamicXPCalculator.calculate_submission_xp(user_id, submission_id, session)
    user = session.get(User, user_id)
    if user:
        user.xp = (user.xp or 0) + xp
        session.add(user)
        session.commit()
    return xp

def award_dynamic_xp_for_event(user_id: int, event_id: int, session: Session) -> int:
    """Award dynamically calculated XP for event attendance (only after event date passes)"""
    from app.models import Event
    event = session.get(Event, event_id)
    if not event:
        return 0
    
    # Only award XP if event has already started
    event_start = event.starts_at
    if event_start.tzinfo is None:
        event_start = event_start.replace(tzinfo=timezone.utc)
    
    now = datetime.now(timezone.utc)
    if event_start > now:
        return 0  # Event hasn't started yet, don't award XP
    
    xp = DynamicXPCalculator.calculate_event_xp(user_id, event_id, session)
    user = session.get(User, user_id)
    if user:
        user.xp = (user.xp or 0) + xp
        session.add(user)
        session.commit()
    return xp

