"""
Advanced Mission Submission Analysis System
- NLP-based automatic quality scoring
- Automatic feedback generation
"""
from typing import Dict
from sqlmodel import Session
import re

from app.models import MissionSubmission


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

