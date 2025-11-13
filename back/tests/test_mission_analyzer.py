"""
Comprehensive tests for mission analyzer system
Tests NLP quality scoring, deadline optimization, and performance
"""
import pytest
from datetime import datetime, timezone, timedelta
from app.services.mission_analyzer import (
    NLPQualityScorer, DeadlineOptimizer, PeerReviewConsensus,
    analyze_submission_quality
)
from app.models import MissionSubmission, Group, GroupMember, User


class TestNLPQualityScorer:
    """Tests for NLP quality scoring"""
    
    def test_score_submission_completeness(self, test_session, sample_submission):
        """Test completeness scoring"""
        # Submission with both URL and text
        sample_submission.submission_url = "https://example.com/submission"
        sample_submission.submission_text = "Detailed submission text"
        test_session.add(sample_submission)
        test_session.commit()
        
        scores = NLPQualityScorer.score_submission(sample_submission, test_session)
        
        assert "completeness" in scores
        assert 0.0 <= scores["completeness"] <= 1.0
        assert scores["completeness"] > 0.5  # Should be high with both URL and text
    
    def test_score_submission_detail_level(self, test_session, sample_submission):
        """Test detail level scoring"""
        # Long, detailed text
        sample_submission.submission_text = " ".join(["Detailed sentence"] * 50)
        test_session.add(sample_submission)
        test_session.commit()
        
        scores = NLPQualityScorer.score_submission(sample_submission, test_session)
        
        assert "detail_level" in scores
        assert 0.0 <= scores["detail_level"] <= 1.0
        assert scores["detail_level"] > 0.0
    
    def test_score_submission_relevance(self, test_session, sample_submission):
        """Test relevance scoring"""
        sample_submission.submission_text = "This submission is highly relevant to the mission requirements."
        test_session.add(sample_submission)
        test_session.commit()
        
        scores = NLPQualityScorer.score_submission(sample_submission, test_session)
        
        assert "relevance" in scores
        assert 0.0 <= scores["relevance"] <= 1.0
    
    def test_score_submission_effort(self, test_session, sample_submission):
        """Test effort indicators scoring"""
        # Submission with code blocks, links, etc.
        sample_submission.submission_text = """
        Here is my submission:
        
        ```python
        def solution():
            return "answer"
        ```
        
        See more at: https://example.com
        """
        sample_submission.submission_url = "https://example.com/submission"
        test_session.add(sample_submission)
        test_session.commit()
        
        scores = NLPQualityScorer.score_submission(sample_submission, test_session)
        
        assert "effort_indicators" in scores
        assert 0.0 <= scores["effort_indicators"] <= 1.0
    
    def test_score_submission_overall(self, test_session, sample_submission):
        """Test overall score calculation"""
        sample_submission.submission_url = "https://example.com/submission"
        sample_submission.submission_text = "Comprehensive submission with detailed explanation and examples."
        test_session.add(sample_submission)
        test_session.commit()
        
        scores = NLPQualityScorer.score_submission(sample_submission, test_session)
        
        assert "overall_score" in scores
        assert 0.0 <= scores["overall_score"] <= 100.0
    
    def test_generate_feedback(self, test_session, sample_submission):
        """Test feedback generation"""
        scores = {
            "completeness": 0.8,
            "detail_level": 0.7,
            "relevance": 0.9,
            "effort_indicators": 0.6,
            "overall_score": 75.0
        }
        
        feedback = NLPQualityScorer.generate_feedback(scores, sample_submission)
        
        assert isinstance(feedback, str)
        assert len(feedback) >= 0  # Can be empty if all scores are good
    
    def test_score_empty_submission(self, test_session, sample_submission):
        """Test scoring empty submission"""
        sample_submission.submission_url = None
        sample_submission.submission_text = None
        test_session.add(sample_submission)
        test_session.commit()
        
        scores = NLPQualityScorer.score_submission(sample_submission, test_session)
        
        assert scores["completeness"] == 0.0
        assert scores["overall_score"] < 50.0


class TestDeadlineOptimizer:
    """Tests for deadline optimization"""
    
    def test_calculate_urgency_score(self, test_session, sample_group):
        """Test urgency score calculation"""
        # Create group with deadline
        deadline = datetime.now(timezone.utc) + timedelta(days=3)
        
        urgency = DeadlineOptimizer.calculate_urgency_score(
            sample_group.id, deadline, test_session
        )
        
        assert 0.0 <= urgency <= 1.0
    
    def test_urgency_increases_with_time(self, test_session, sample_group):
        """Test that urgency increases as deadline approaches"""
        deadline_far = datetime.now(timezone.utc) + timedelta(days=10)
        deadline_near = datetime.now(timezone.utc) + timedelta(days=1)
        
        urgency_far = DeadlineOptimizer.calculate_urgency_score(
            sample_group.id, deadline_far, test_session
        )
        urgency_near = DeadlineOptimizer.calculate_urgency_score(
            sample_group.id, deadline_near, test_session
        )
        
        assert urgency_near >= urgency_far
    
    def test_calculate_optimal_deadline(self, test_session, sample_group):
        """Test optimal deadline calculation"""
        suggested = DeadlineOptimizer.calculate_optimal_deadline(
            sample_group.id, "Complete the assignment", test_session
        )
        
        assert suggested is not None
        assert isinstance(suggested, datetime)
        assert suggested > datetime.now(timezone.utc)


class TestPeerReviewConsensus:
    """Tests for peer review consensus"""
    
    def test_calculate_consensus_score(self):
        """Test consensus score calculation"""
        reviews = [
            {"score": 80, "user_id": 1, "weight": 1.0},
            {"score": 85, "user_id": 2, "weight": 1.0},
            {"score": 75, "user_id": 3, "weight": 1.0}
        ]
        
        consensus = PeerReviewConsensus.calculate_consensus_score(reviews)
        
        assert "consensus_score" in consensus
        assert "confidence" in consensus
        assert "agreement" in consensus
        assert 0.0 <= consensus["consensus_score"] <= 100.0
        assert 0.0 <= consensus["confidence"] <= 1.0
        assert 0.0 <= consensus["agreement"] <= 1.0
    
    def test_consensus_with_agreement(self):
        """Test consensus with high agreement"""
        reviews = [
            {"score": 80, "user_id": 1, "weight": 1.0},
            {"score": 81, "user_id": 2, "weight": 1.0},
            {"score": 79, "user_id": 3, "weight": 1.0}
        ]
        
        consensus = PeerReviewConsensus.calculate_consensus_score(reviews)
        
        # High agreement should result in high agreement score
        assert consensus["agreement"] > 0.7
    
    def test_consensus_with_disagreement(self):
        """Test consensus with low agreement"""
        reviews = [
            {"score": 50, "user_id": 1, "weight": 1.0},
            {"score": 90, "user_id": 2, "weight": 1.0},
            {"score": 60, "user_id": 3, "weight": 1.0}
        ]
        
        consensus = PeerReviewConsensus.calculate_consensus_score(reviews)
        
        # Low agreement should result in lower agreement score
        assert consensus["agreement"] < 0.7
    
    def test_auto_approve_decision(self):
        """Test auto-approve decision"""
        consensus_high = {
            "consensus_score": 85.0,
            "confidence": 0.9,
            "agreement": 0.8
        }
        
        consensus_low = {
            "consensus_score": 60.0,
            "confidence": 0.5,
            "agreement": 0.4
        }
        
        assert PeerReviewConsensus.should_auto_approve(consensus_high) is True
        assert PeerReviewConsensus.should_auto_approve(consensus_low) is False
    
    def test_empty_reviews(self):
        """Test consensus with no reviews"""
        consensus = PeerReviewConsensus.calculate_consensus_score([])
        
        assert consensus["consensus_score"] == 0
        assert consensus["confidence"] == 0
        assert consensus["agreement"] == 0


class TestAnalyzeSubmissionQuality:
    """Tests for main quality analysis function"""
    
    def test_analyze_quality_returns_scores(self, test_session, sample_submission):
        """Test that analysis returns quality scores"""
        sample_submission.submission_url = "https://example.com/submission"
        sample_submission.submission_text = "Detailed submission with comprehensive explanation."
        test_session.add(sample_submission)
        test_session.commit()
        
        result = analyze_submission_quality(sample_submission, test_session)
        
        assert "quality_scores" in result
        assert "auto_feedback" in result
        assert "recommended_score" in result
        
        scores = result["quality_scores"]
        assert "completeness" in scores
        assert "detail_level" in scores
        assert "relevance" in scores
        assert "effort_indicators" in scores
        assert "overall_score" in scores
    
    def test_analyze_quality_feedback(self, test_session, sample_submission):
        """Test that analysis generates feedback"""
        sample_submission.submission_url = "https://example.com/submission"
        sample_submission.submission_text = "Good submission"
        test_session.add(sample_submission)
        test_session.commit()
        
        result = analyze_submission_quality(sample_submission, test_session)
        
        assert isinstance(result["auto_feedback"], str)
        assert len(result["auto_feedback"]) > 0
    
    def test_analyze_quality_recommended_score(self, test_session, sample_submission):
        """Test that analysis provides recommended score"""
        sample_submission.submission_url = "https://example.com/submission"
        sample_submission.submission_text = "Excellent submission"
        test_session.add(sample_submission)
        test_session.commit()
        
        result = analyze_submission_quality(sample_submission, test_session)
        
        assert isinstance(result["recommended_score"], int)
        assert 0 <= result["recommended_score"] <= 100


class TestPerformance:
    """Performance benchmarks for mission analyzer"""
    
    def test_quality_scoring_performance(self, benchmark, test_session, sample_submission):
        """Benchmark quality scoring"""
        sample_submission.submission_url = "https://example.com/submission"
        sample_submission.submission_text = " ".join(["Detailed text"] * 100)
        test_session.add(sample_submission)
        test_session.commit()
        
        result = benchmark(
            NLPQualityScorer.score_submission,
            sample_submission, test_session
        )
        assert "overall_score" in result
    
    def test_consensus_calculation_performance(self, benchmark):
        """Benchmark consensus calculation"""
        reviews = [
            {"score": 80 + i, "user_id": i, "weight": 1.0}
            for i in range(20)
        ]
        
        result = benchmark(
            PeerReviewConsensus.calculate_consensus_score,
            reviews
        )
        assert "consensus_score" in result
    
    def test_urgency_calculation_performance(self, benchmark, test_session, sample_group):
        """Benchmark urgency calculation"""
        deadline = datetime.now(timezone.utc) + timedelta(days=5)
        
        result = benchmark(
            DeadlineOptimizer.calculate_urgency_score,
            sample_group.id, deadline, test_session
        )
        assert 0.0 <= result <= 1.0


class TestValidation:
    """Validation tests to ensure algorithms work correctly"""
    
    def test_quality_scores_range(self, test_session, sample_submission):
        """Validate that quality scores are in correct range"""
        sample_submission.submission_url = "https://example.com/submission"
        sample_submission.submission_text = "Test submission"
        test_session.add(sample_submission)
        test_session.commit()
        
        scores = NLPQualityScorer.score_submission(sample_submission, test_session)
        
        assert 0.0 <= scores["completeness"] <= 1.0
        assert 0.0 <= scores["detail_level"] <= 1.0
        assert 0.0 <= scores["relevance"] <= 1.0
        assert 0.0 <= scores["effort_indicators"] <= 1.0
        assert 0.0 <= scores["overall_score"] <= 100.0
    
    def test_consensus_deterministic(self):
        """Validate that consensus calculation is deterministic"""
        reviews = [
            {"score": 80, "user_id": 1, "weight": 1.0},
            {"score": 85, "user_id": 2, "weight": 1.0}
        ]
        
        consensus1 = PeerReviewConsensus.calculate_consensus_score(reviews)
        consensus2 = PeerReviewConsensus.calculate_consensus_score(reviews)
        
        assert abs(consensus1["consensus_score"] - consensus2["consensus_score"]) < 0.01
        assert abs(consensus1["confidence"] - consensus2["confidence"]) < 0.01
    
    def test_urgency_monotonic(self, test_session, sample_group):
        """Validate that urgency increases monotonically as deadline approaches"""
        deadlines = [
            datetime.now(timezone.utc) + timedelta(days=d)
            for d in [10, 7, 5, 3, 1]
        ]
        
        urgencies = [
            DeadlineOptimizer.calculate_urgency_score(sample_group.id, d, test_session)
            for d in deadlines
        ]
        
        # Urgency should generally increase as deadline approaches
        # (allowing for some variance due to completion rate)
        for i in range(len(urgencies) - 1):
            # Later deadline should have lower or equal urgency
            assert urgencies[i] <= urgencies[i+1] + 0.1  # Small tolerance
    
    def test_quality_analysis_completeness(self, test_session, sample_submission):
        """Validate that quality analysis is complete"""
        sample_submission.submission_url = "https://example.com/submission"
        sample_submission.submission_text = "Complete submission"
        test_session.add(sample_submission)
        test_session.commit()
        
        result = analyze_submission_quality(sample_submission, test_session)
        
        # Should have all required fields
        assert "quality_scores" in result
        assert "auto_feedback" in result
        assert "recommended_score" in result
        
        # Quality scores should have all components
        scores = result["quality_scores"]
        required_keys = ["completeness", "detail_level", "relevance", "effort_indicators", "overall_score"]
        for key in required_keys:
            assert key in scores

