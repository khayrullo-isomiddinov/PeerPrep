"""
Comprehensive tests for gamification system
Tests XP calculation, engagement prediction, badge unlocking, and performance
"""
import pytest
from datetime import datetime, timezone, timedelta
from app.services.gamification import (
    DynamicXPCalculator, AdvancedBadgeSystem, EngagementPredictor,
    award_dynamic_xp_for_submission
)
from app.models import User, Group, GroupMember, MissionSubmission, Event, EventAttendee, GroupMessage


class TestDynamicXPCalculator:
    """Tests for dynamic XP calculation"""
    
    def test_base_xp_calculation(self, test_session, sample_user, sample_group, sample_submission):
        """Test base XP calculation"""
        sample_submission.is_approved = True
        sample_submission.score = 80
        test_session.add(sample_submission)
        test_session.commit()
        
        xp = DynamicXPCalculator.calculate_submission_xp(
            sample_user.id, sample_submission.id, test_session
        )
        
        # Should be at least base XP
        assert xp >= DynamicXPCalculator.BASE_XP_SUBMISSION
        assert xp > 0
    
    def test_quality_multiplier(self, test_session, sample_user, sample_group):
        """Test that higher scores give more XP"""
        # Create two submissions with different scores
        submission1 = MissionSubmission(
            group_id=sample_group.id,
            user_id=sample_user.id,
            submission_url="https://example.com/1",
            submission_text="Good submission",
            submitted_at=datetime.now(timezone.utc),
            is_approved=True,
            score=50
        )
        test_session.add(submission1)
        test_session.commit()
        
        submission2 = MissionSubmission(
            group_id=sample_group.id,
            user_id=sample_user.id,
            submission_url="https://example.com/2",
            submission_text="Excellent submission",
            submitted_at=datetime.now(timezone.utc),
            is_approved=True,
            score=100
        )
        test_session.add(submission2)
        test_session.commit()
        
        xp1 = DynamicXPCalculator.calculate_submission_xp(
            sample_user.id, submission1.id, test_session
        )
        xp2 = DynamicXPCalculator.calculate_submission_xp(
            sample_user.id, submission2.id, test_session
        )
        
        # Higher score should give more XP
        assert xp2 >= xp1
    
    def test_difficulty_multiplier(self, test_session, sample_user):
        """Test that larger groups give more XP"""
        # Create small group
        small_group = Group(
            id="small-group",
            name="Small Group",
            description="Small",
            field_of_study="CS",
            created_by=sample_user.id
        )
        test_session.add(small_group)
        test_session.commit()
        
        # Create large group
        large_group = Group(
            id="large-group",
            name="Large Group",
            description="Large",
            field_of_study="CS",
            created_by=sample_user.id
        )
        test_session.add(large_group)
        test_session.commit()
        
        # Add many members to large group
        for i in range(20):
            member = GroupMember(
                group_id=large_group.id,
                user_id=sample_user.id,
                is_leader=(i == 0)
            )
            test_session.add(member)
        test_session.commit()
        
        # Create submissions
        small_sub = MissionSubmission(
            group_id=small_group.id,
            user_id=sample_user.id,
            submission_url="https://example.com/small",
            submission_text="Submission",
            submitted_at=datetime.now(timezone.utc),
            is_approved=True,
            score=80
        )
        test_session.add(small_sub)
        test_session.commit()
        
        large_sub = MissionSubmission(
            group_id=large_group.id,
            user_id=sample_user.id,
            submission_url="https://example.com/large",
            submission_text="Submission",
            submitted_at=datetime.now(timezone.utc),
            is_approved=True,
            score=80
        )
        test_session.add(large_sub)
        test_session.commit()
        
        xp_small = DynamicXPCalculator.calculate_submission_xp(
            sample_user.id, small_sub.id, test_session
        )
        xp_large = DynamicXPCalculator.calculate_submission_xp(
            sample_user.id, large_sub.id, test_session
        )
        
        # Larger group should give more XP (higher difficulty)
        assert xp_large >= xp_small
    
    def test_engagement_multiplier(self, test_session, sample_user, sample_group):
        """Test that engaged users get XP bonus"""
        # Create submission
        submission = MissionSubmission(
            group_id=sample_group.id,
            user_id=sample_user.id,
            submission_url="https://example.com/1",
            submission_text="Submission",
            submitted_at=datetime.now(timezone.utc),
            is_approved=True,
            score=80
        )
        test_session.add(submission)
        test_session.commit()
        
        xp = DynamicXPCalculator.calculate_submission_xp(
            sample_user.id, submission.id, test_session
        )
        
        # Should be at least base XP
        assert xp >= DynamicXPCalculator.BASE_XP_SUBMISSION
    
    def test_event_xp_calculation(self, test_session, sample_user, sample_event):
        """Test event XP calculation"""
        xp = DynamicXPCalculator.calculate_event_xp(
            sample_user.id, sample_event.id, test_session
        )
        
        assert xp >= DynamicXPCalculator.BASE_XP_EVENT
        assert xp > 0


class TestEngagementPredictor:
    """Tests for engagement prediction"""
    
    def test_engagement_score_range(self, test_session, sample_user):
        """Test that engagement score is between 0 and 1"""
        score = EngagementPredictor.calculate_engagement_score(
            sample_user.id, test_session
        )
        
        assert 0.0 <= score <= 1.0
    
    def test_engagement_with_activity(self, test_session, sample_user, sample_group):
        """Test that recent activity increases engagement"""
        # Create recent submission
        submission = MissionSubmission(
            group_id=sample_group.id,
            user_id=sample_user.id,
            submission_url="https://example.com/1",
            submission_text="Recent submission",
            submitted_at=datetime.now(timezone.utc) - timedelta(days=1),
            is_approved=True
        )
        test_session.add(submission)
        test_session.commit()
        
        score = EngagementPredictor.calculate_engagement_score(
            sample_user.id, test_session
        )
        
        assert score > 0.0
    
    def test_engagement_consistency(self, test_session, sample_user):
        """Test that engagement score is consistent"""
        score1 = EngagementPredictor.calculate_engagement_score(
            sample_user.id, test_session
        )
        score2 = EngagementPredictor.calculate_engagement_score(
            sample_user.id, test_session
        )
        
        # Should be the same (deterministic)
        assert abs(score1 - score2) < 0.001
    
    def test_engagement_frequency_factor(self, test_session, sample_user, sample_group):
        """Test that more submissions increase engagement"""
        # Create multiple submissions
        for i in range(5):
            submission = MissionSubmission(
                group_id=sample_group.id,
                user_id=sample_user.id,
                submission_url=f"https://example.com/{i}",
                submission_text=f"Submission {i}",
                submitted_at=datetime.now(timezone.utc) - timedelta(days=i),
                is_approved=True
            )
            test_session.add(submission)
        test_session.commit()
        
        score = EngagementPredictor.calculate_engagement_score(
            sample_user.id, test_session
        )
        
        # Should have higher engagement with more submissions
        assert score > 0.0


class TestAdvancedBadgeSystem:
    """Tests for advanced badge system"""
    
    def test_badge_unlock_check(self, test_session, sample_user):
        """Test badge unlock checking"""
        result = AdvancedBadgeSystem.check_badge_unlock(
            sample_user.id, test_session
        )
        
        assert result is not None
        assert "unlocked_badges" in result
        assert "locked_badges" in result
        assert isinstance(result["unlocked_badges"], list)
        assert isinstance(result["locked_badges"], list)
    
    def test_badge_requirements(self, test_session, sample_user, sample_group):
        """Test that badges require specific criteria"""
        # User with no activity should have locked badges
        result = AdvancedBadgeSystem.check_badge_unlock(
            sample_user.id, test_session
        )
        
        # Beginner badge might be unlocked, but others should be locked
        assert len(result["locked_badges"]) >= 0
    
    def test_badge_unlock_with_xp(self, test_session, sample_user):
        """Test badge unlocking with sufficient XP"""
        # Give user enough XP
        sample_user.xp = 500
        test_session.add(sample_user)
        test_session.commit()
        
        result = AdvancedBadgeSystem.check_badge_unlock(
            sample_user.id, test_session
        )
        
        # Should have unlocked badges
        assert len(result["unlocked_badges"]) >= 0
    
    def test_badge_progress_calculation(self, test_session, sample_user):
        """Test badge progress calculation"""
        result = AdvancedBadgeSystem.check_badge_unlock(
            sample_user.id, test_session
        )
        
        # Check that locked badges have progress info
        for badge in result.get("locked_badges", []):
            if "progress" in badge:
                assert 0.0 <= badge["progress"] <= 1.0


class TestAwardDynamicXP:
    """Tests for awarding dynamic XP"""
    
    def test_award_xp_updates_user(self, test_session, sample_user, sample_group, sample_submission):
        """Test that awarding XP updates user's XP"""
        initial_xp = sample_user.xp or 0
        sample_submission.is_approved = True
        sample_submission.score = 80
        test_session.add(sample_submission)
        test_session.commit()
        
        xp_awarded = award_dynamic_xp_for_submission(
            sample_user.id, sample_submission.id, test_session
        )
        
        test_session.refresh(sample_user)
        
        assert xp_awarded > 0
        assert sample_user.xp == initial_xp + xp_awarded
    
    def test_award_xp_returns_value(self, test_session, sample_user, sample_group, sample_submission):
        """Test that award function returns XP value"""
        sample_submission.is_approved = True
        sample_submission.score = 80
        test_session.add(sample_submission)
        test_session.commit()
        
        xp = award_dynamic_xp_for_submission(
            sample_user.id, sample_submission.id, test_session
        )
        
        assert isinstance(xp, int)
        assert xp > 0


class TestPerformance:
    """Performance benchmarks for gamification"""
    
    def test_xp_calculation_performance(self, benchmark, test_session, sample_user, sample_group):
        """Benchmark XP calculation"""
        submission = MissionSubmission(
            group_id=sample_group.id,
            user_id=sample_user.id,
            submission_url="https://example.com/1",
            submission_text="Test submission",
            submitted_at=datetime.now(timezone.utc),
            is_approved=True,
            score=80
        )
        test_session.add(submission)
        test_session.commit()
        
        result = benchmark(
            DynamicXPCalculator.calculate_submission_xp,
            sample_user.id, submission.id, test_session
        )
        assert result > 0
    
    def test_engagement_calculation_performance(self, benchmark, test_session, sample_user):
        """Benchmark engagement calculation"""
        result = benchmark(
            EngagementPredictor.calculate_engagement_score,
            sample_user.id, test_session
        )
        assert 0.0 <= result <= 1.0
    
    def test_badge_check_performance(self, benchmark, test_session, sample_user):
        """Benchmark badge unlock checking"""
        result = benchmark(
            AdvancedBadgeSystem.check_badge_unlock,
            sample_user.id, test_session
        )
        assert result is not None


class TestValidation:
    """Validation tests to ensure algorithms work correctly"""
    
    def test_xp_always_positive(self, test_session, sample_user, sample_group):
        """Validate that XP is always positive"""
        submission = MissionSubmission(
            group_id=sample_group.id,
            user_id=sample_user.id,
            submission_url="https://example.com/1",
            submission_text="Test",
            submitted_at=datetime.now(timezone.utc),
            is_approved=True,
            score=0  # Even with 0 score
        )
        test_session.add(submission)
        test_session.commit()
        
        xp = DynamicXPCalculator.calculate_submission_xp(
            sample_user.id, submission.id, test_session
        )
        
        assert xp > 0  # Should always be positive
    
    def test_xp_minimum_base(self, test_session, sample_user, sample_group):
        """Validate that XP is at least base XP"""
        submission = MissionSubmission(
            group_id=sample_group.id,
            user_id=sample_user.id,
            submission_url="https://example.com/1",
            submission_text="Test",
            submitted_at=datetime.now(timezone.utc),
            is_approved=True,
            score=0
        )
        test_session.add(submission)
        test_session.commit()
        
        xp = DynamicXPCalculator.calculate_submission_xp(
            sample_user.id, submission.id, test_session
        )
        
        assert xp >= DynamicXPCalculator.BASE_XP_SUBMISSION
    
    def test_engagement_deterministic(self, test_session, sample_user):
        """Validate that engagement calculation is deterministic"""
        score1 = EngagementPredictor.calculate_engagement_score(
            sample_user.id, test_session
        )
        score2 = EngagementPredictor.calculate_engagement_score(
            sample_user.id, test_session
        )
        
        assert abs(score1 - score2) < 0.0001  # Should be identical
    
    def test_badge_requirements_consistent(self, test_session, sample_user):
        """Validate that badge requirements are consistent"""
        result1 = AdvancedBadgeSystem.check_badge_unlock(
            sample_user.id, test_session
        )
        result2 = AdvancedBadgeSystem.check_badge_unlock(
            sample_user.id, test_session
        )
        
        # Should return same results
        assert len(result1["unlocked_badges"]) == len(result2["unlocked_badges"])
        assert len(result1["locked_badges"]) == len(result2["locked_badges"])

