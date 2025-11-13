"""
Advanced Mission Submission Analysis System
- NLP-based automatic quality scoring
- Smart deadline optimization algorithms
- Peer review consensus mechanisms
- Automatic feedback generation
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select, func
import re
import math

from app.models import MissionSubmission, Group, GroupMember, User


class NLPQualityScorer:
    """NLP-inspired quality scoring for mission submissions"""
    
    @staticmethod
    def score_submission(submission: MissionSubmission, session: Session) -> Dict[str, float]:
        """
        Analyze submission quality using multiple factors
        Returns: {
            "overall_score": 0-100,
            "completeness": 0-1,
            "detail_level": 0-1,
            "relevance": 0-1,
            "effort_indicators": 0-1
        }
        """
        scores = {
            "completeness": 0.0,
            "detail_level": 0.0,
            "relevance": 0.0,
            "effort_indicators": 0.0
        }
        
        # Factor 1: Completeness (has both URL and text)
        has_url = bool(submission.submission_url and submission.submission_url.strip())
        has_text = bool(submission.submission_text and submission.submission_text.strip())
        
        if has_url and has_text:
            scores["completeness"] = 1.0
        elif has_url or has_text:
            scores["completeness"] = 0.6
        else:
            scores["completeness"] = 0.0
        
        # Factor 2: Detail Level (text length and structure)
        if submission.submission_text:
            text = submission.submission_text.strip()
            word_count = len(text.split())
            char_count = len(text)
            
            # Check for structured content (bullets, numbers, paragraphs)
            has_structure = bool(
                re.search(r'[•\-\*]|^\d+\.', text, re.MULTILINE) or
                text.count('\n') >= 2
            )
            
            # Word count scoring (optimal: 50-200 words)
            if 50 <= word_count <= 200:
                word_score = 1.0
            elif 20 <= word_count < 50 or 200 < word_count <= 300:
                word_score = 0.7
            elif word_count < 20:
                word_score = 0.4
            else:
                word_score = 0.8  # Very long but detailed
            
            # Structure bonus
            structure_bonus = 0.2 if has_structure else 0.0
            
            scores["detail_level"] = min(1.0, word_score + structure_bonus)
        else:
            scores["detail_level"] = 0.3  # URL only
        
        # Factor 3: Relevance (check if text mentions mission-related keywords)
        if submission.submission_text:
            text_lower = submission.submission_text.lower()
            
            # Mission-related keywords
            mission_keywords = [
                "complete", "finished", "done", "accomplished",
                "learned", "understood", "practice", "study",
                "challenge", "mission", "goal", "objective",
                "result", "outcome", "achievement"
            ]
            
            keyword_count = sum(1 for keyword in mission_keywords if keyword in text_lower)
            scores["relevance"] = min(1.0, keyword_count / 5.0)
        else:
            scores["relevance"] = 0.5  # Neutral if no text
        
        # Factor 4: Effort Indicators
        effort_score = 0.0
        
        # Check URL domain (GitHub, YouTube, etc. indicate more effort)
        if submission.submission_url:
            url_lower = submission.submission_url.lower()
            high_effort_domains = [
                "github.com", "youtube.com", "vimeo.com",
                "codepen.io", "repl.it", "jsfiddle.net"
            ]
            if any(domain in url_lower for domain in high_effort_domains):
                effort_score += 0.4
            
            # URL length (longer URLs might indicate more specific content)
            if len(submission.submission_url) > 50:
                effort_score += 0.2
        
        # Text quality indicators
        if submission.submission_text:
            text = submission.submission_text
            
            # Has code blocks or technical content
            if re.search(r'```|function|class|def |import ', text):
                effort_score += 0.2
            
            # Has links or references
            if re.search(r'http|www\.|@', text):
                effort_score += 0.2
        
        scores["effort_indicators"] = min(1.0, effort_score)
        
        # Calculate overall score (weighted average)
        overall = (
            scores["completeness"] * 0.25 +
            scores["detail_level"] * 0.35 +
            scores["relevance"] * 0.25 +
            scores["effort_indicators"] * 0.15
        ) * 100
        
        scores["overall_score"] = round(overall, 1)
        
        return scores
    
    @staticmethod
    def generate_feedback(scores: Dict[str, float], submission: MissionSubmission) -> str:
        """Generate automatic feedback based on quality scores"""
        feedback_parts = []
        
        if scores["completeness"] < 0.6:
            feedback_parts.append("Consider adding both a submission URL and a text description for better clarity.")
        
        if scores["detail_level"] < 0.5:
            if submission.submission_text:
                word_count = len(submission.submission_text.split())
                if word_count < 20:
                    feedback_parts.append("Your description is quite brief. Adding more details about what you accomplished would be helpful.")
                else:
                    feedback_parts.append("Consider structuring your submission with bullet points or clear sections.")
            else:
                feedback_parts.append("Adding a text description would help explain your submission.")
        
        if scores["relevance"] < 0.5:
            feedback_parts.append("Try to connect your submission more directly to the mission objectives.")
        
        if scores["effort_indicators"] < 0.4:
            feedback_parts.append("Consider including more evidence of your work, such as code, documentation, or detailed explanations.")
        
        if not feedback_parts:
            return "Great submission! Well-structured and detailed."
        
        return " ".join(feedback_parts)


class DeadlineOptimizer:
    """Smart deadline calculation and optimization algorithms"""
    
    @staticmethod
    def calculate_optimal_deadline(group_id: str, mission_description: str, 
                                  session: Session) -> datetime:
        """
        Calculate optimal deadline based on:
        - Mission complexity (estimated from description)
        - Group size and activity level
        - Historical completion times
        - Member engagement levels
        """
        now = datetime.now(timezone.utc)
        
        # Factor 1: Mission complexity (from description length and keywords)
        complexity_days = DeadlineOptimizer._estimate_complexity(mission_description)
        
        # Factor 2: Group size (larger groups need more time for coordination)
        group = session.get(Group, group_id)
        if group:
            member_count = session.exec(
                select(func.count(GroupMember.id)).where(
                    GroupMember.group_id == group_id
                )
            ).one() or 1
            
            size_factor = 1.0 + (member_count / 10.0) * 0.3  # Up to 30% more time
        else:
            size_factor = 1.0
        
        # Factor 3: Group activity level (active groups complete faster)
        recent_submissions = session.exec(
            select(func.count(MissionSubmission.id)).where(
                MissionSubmission.group_id == group_id,
                MissionSubmission.submitted_at > now - timedelta(days=30)
            )
        ).one() or 0
        
        activity_factor = max(0.7, 1.0 - (recent_submissions / 20.0) * 0.3)  # Active = faster
        
        # Factor 4: Average completion time (if historical data exists)
        avg_completion_days = DeadlineOptimizer._get_avg_completion_time(group_id, session)
        
        if avg_completion_days:
            historical_factor = avg_completion_days
        else:
            historical_factor = complexity_days
        
        # Calculate optimal deadline
        base_days = complexity_days * size_factor * activity_factor
        optimal_days = (base_days + historical_factor) / 2.0  # Average of calculated and historical
        
        # Clamp to reasonable range (3-21 days)
        optimal_days = max(3, min(21, optimal_days))
        
        return now + timedelta(days=int(optimal_days))
    
    @staticmethod
    def _estimate_complexity(description: str) -> int:
        """Estimate mission complexity from description"""
        if not description:
            return 7  # Default: 1 week
        
        desc_lower = description.lower()
        word_count = len(description.split())
        
        # Complexity indicators
        complex_keywords = [
            "build", "create", "develop", "implement", "design",
            "analyze", "research", "comprehensive", "detailed"
        ]
        
        simple_keywords = [
            "review", "read", "watch", "summarize", "brief"
        ]
        
        complex_count = sum(1 for kw in complex_keywords if kw in desc_lower)
        simple_count = sum(1 for kw in simple_keywords if kw in desc_lower)
        
        # Base complexity from word count
        if word_count < 50:
            base_days = 5
        elif word_count < 100:
            base_days = 7
        elif word_count < 200:
            base_days = 10
        else:
            base_days = 14
        
        # Adjust based on keywords
        if complex_count > simple_count:
            base_days += 3
        elif simple_count > complex_count:
            base_days -= 2
        
        return max(3, min(21, base_days))
    
    @staticmethod
    def _get_avg_completion_time(group_id: str, session: Session) -> Optional[float]:
        """Get average time to complete missions for this group"""
        # Get missions with deadlines and completion times
        # This would require adding deadline field to Group model
        # For now, return None (no historical data)
        return None
    
    @staticmethod
    def calculate_urgency_score(group_id: str, deadline: datetime, 
                                session: Session) -> float:
        """
        Calculate how urgent a mission is (0-1)
        Higher = more urgent (closer to deadline, fewer completions)
        """
        now = datetime.now(timezone.utc)
        
        if deadline <= now:
            return 1.0  # Past deadline
        
        time_remaining = (deadline - now).total_seconds() / 86400  # days
        
        # Get completion rate
        total_members = session.exec(
            select(func.count(GroupMember.id)).where(
                GroupMember.group_id == group_id
            )
        ).one() or 1
        
        completed = session.exec(
            select(func.count(MissionSubmission.id)).where(
                MissionSubmission.group_id == group_id,
                MissionSubmission.is_approved == True
            )
        ).one() or 0
        
        completion_rate = completed / total_members if total_members > 0 else 0
        
        # Urgency based on time and completion
        time_urgency = max(0.0, 1.0 - (time_remaining / 7.0))  # 7 days = 0 urgency
        completion_urgency = 1.0 - completion_rate  # Low completion = high urgency
        
        return (time_urgency * 0.6 + completion_urgency * 0.4)


class PeerReviewConsensus:
    """Peer review system with consensus algorithms"""
    
    @staticmethod
    def calculate_consensus_score(reviews: List[Dict]) -> Dict[str, float]:
        """
        Calculate consensus score from multiple peer reviews
        reviews: [{"score": 85, "user_id": 1, "weight": 1.0}, ...]
        Returns: {"consensus_score": 0-100, "confidence": 0-1, "agreement": 0-1}
        """
        if not reviews:
            return {"consensus_score": 0, "confidence": 0, "agreement": 0}
        
        # Weighted average score
        total_weight = sum(r.get("weight", 1.0) for r in reviews)
        weighted_sum = sum(r["score"] * r.get("weight", 1.0) for r in reviews)
        consensus_score = weighted_sum / total_weight if total_weight > 0 else 0
        
        # Agreement (lower variance = higher agreement)
        scores = [r["score"] for r in reviews]
        if len(scores) > 1:
            mean = sum(scores) / len(scores)
            variance = sum((s - mean) ** 2 for s in scores) / len(scores)
            std_dev = math.sqrt(variance)
            # Agreement: 1.0 = perfect agreement, 0.0 = high disagreement
            agreement = max(0.0, 1.0 - (std_dev / 50.0))  # Normalize by max possible std dev
        else:
            agreement = 0.5  # Single review = moderate agreement
        
        # Confidence (based on number of reviews and agreement)
        num_reviews = len(reviews)
        confidence = min(1.0, (num_reviews / 5.0) * 0.7 + agreement * 0.3)
        
        return {
            "consensus_score": round(consensus_score, 1),
            "confidence": round(confidence, 2),
            "agreement": round(agreement, 2)
        }
    
    @staticmethod
    def should_auto_approve(consensus: Dict[str, float], threshold: float = 0.8) -> bool:
        """Determine if submission should be auto-approved based on consensus"""
        return (
            consensus["consensus_score"] >= 70 and
            consensus["confidence"] >= threshold and
            consensus["agreement"] >= 0.7
        )


def analyze_submission_quality(submission: MissionSubmission, 
                              session: Session) -> Dict:
    """Main function to analyze submission quality"""
    scores = NLPQualityScorer.score_submission(submission, session)
    feedback = NLPQualityScorer.generate_feedback(scores, submission)
    
    return {
        "quality_scores": scores,
        "auto_feedback": feedback,
        "recommended_score": int(scores["overall_score"])
    }

