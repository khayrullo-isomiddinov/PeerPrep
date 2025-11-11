"""AI service for OpenAI integration"""
from openai import OpenAI
from app.config import settings
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json

# Initialize OpenAI client
_client = None

def get_openai_client() -> OpenAI:
    """Get or create OpenAI client instance"""
    global _client
    if _client is None:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set in environment variables")
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client

async def test_connection() -> bool:
    """Test OpenAI API connection"""
    try:
        client = get_openai_client()
        # Simple test call
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Say 'Hello' if you can read this."}
            ],
            max_tokens=10
        )
        return response.choices[0].message.content is not None
    except Exception as e:
        print(f"OpenAI connection test failed: {e}")
        return False

async def generate_event_suggestions(
    user_context: Dict,
    num_suggestions: int = 3
) -> List[Dict]:
    """
    Generate AI-powered event suggestions based on user context.
    
    Args:
        user_context: Dictionary containing:
            - groups: List of user's groups with field, exam, deadline
            - preferred_location: User's preferred location (optional)
            - recent_events: List of recent events user attended (optional)
        num_suggestions: Number of suggestions to generate (1-3)
    
    Returns:
        List of event suggestions with title, description, suggested_date, location, capacity
    """
    client = get_openai_client()
    
    # Build context string
    context_parts = []
    
    if user_context.get("groups"):
        groups_info = []
        for group in user_context["groups"]:
            group_str = f"- {group.get('name', 'Study Group')} ({group.get('field', 'General')})"
            if group.get("exam"):
                group_str += f" preparing for {group['exam']}"
            if group.get("deadline"):
                group_str += f" (deadline: {group['deadline']})"
            groups_info.append(group_str)
        context_parts.append(f"User's study groups:\n" + "\n".join(groups_info))
    
    if user_context.get("preferred_location"):
        context_parts.append(f"Preferred location: {user_context['preferred_location']}")
    
    if user_context.get("recent_events"):
        events_info = [f"- {e.get('title', 'Event')} at {e.get('location', 'Unknown')}" 
                      for e in user_context["recent_events"][:5]]
        context_parts.append(f"Recent events attended:\n" + "\n".join(events_info))
    
    context_str = "\n\n".join(context_parts) if context_parts else "No specific context available."
    
    # Calculate optimal date range (next 2-4 weeks, avoiding weekends if possible)
    today = datetime.now()
    min_date = (today + timedelta(days=3)).strftime("%Y-%m-%d")
    max_date = (today + timedelta(days=28)).strftime("%Y-%m-%d")
    
    # Build the prompt
    prompt = f"""You are an AI assistant helping students create engaging study events on PeerPrep, a platform for peer learning and collaboration.

User Context:
{context_str}

Generate {num_suggestions} creative, engaging event suggestions that would be valuable for this user. Each suggestion should be:
1. Relevant to their study groups and interests
2. Practical and actionable (study sessions, review groups, practice exams, etc.)
3. Engaging with creative titles that inspire participation
4. Well-described with clear value propositions

For each suggestion, provide:
- title: A catchy, engaging title (max 80 characters)
- description: A compelling description explaining what the event is about and why people should attend (2-3 sentences, max 300 characters)
- suggested_date: A suggested date in YYYY-MM-DD format (between {min_date} and {max_date}, prefer weekdays)
- suggested_time: A suggested time in HH:MM format (prefer afternoon/evening, 14:00-20:00)
- location_suggestion: A relevant location suggestion (e.g., "Central Library Study Room", "Coffee Shop Downtown", "University Campus - Building A")
- capacity_suggestion: Suggested capacity (between 5-20, based on event type)
- category: One of: Mathematics, Physics, Chemistry, Biology, Computer Science, Engineering, Literature, History, Economics, Psychology, Medicine, Law, Business, Art, Music, Other

Return a JSON object with a "suggestions" key containing an array of event objects. Each object must have these exact keys: title, description, suggested_date, suggested_time, location_suggestion, capacity_suggestion, category

Example format:
{{
  "suggestions": [
    {{
      "title": "CS2100 Midterm Prep Session",
      "description": "Join us for an intensive review session covering key topics. We'll work through practice problems and clarify concepts together.",
      "suggested_date": "2024-01-15",
      "suggested_time": "18:00",
      "location_suggestion": "Engineering Library - Study Room 3",
      "capacity_suggestion": 12,
      "category": "Computer Science"
    }}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using gpt-4o-mini for cost efficiency, can upgrade to gpt-4 if needed
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that generates study event suggestions. Always return valid JSON with a 'suggestions' array."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,  # Higher creativity
            max_tokens=1500,
            response_format={"type": "json_object"}  # Force JSON response
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        try:
            # Handle if response is wrapped in markdown code blocks
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()
            
            # Try parsing as direct JSON object with "suggestions" key, or as array
            parsed = json.loads(content)
            
            # Handle different response formats
            if isinstance(parsed, list):
                suggestions = parsed
            elif isinstance(parsed, dict) and "suggestions" in parsed:
                suggestions = parsed["suggestions"]
            elif isinstance(parsed, dict):
                # If it's a single object, wrap it
                suggestions = [parsed]
            else:
                suggestions = []
            
            # Validate and clean suggestions
            validated_suggestions = []
            for sug in suggestions[:num_suggestions]:
                if all(key in sug for key in ["title", "description", "suggested_date", "suggested_time", "location_suggestion", "capacity_suggestion", "category"]):
                    # Ensure capacity is reasonable
                    sug["capacity_suggestion"] = max(5, min(20, int(sug.get("capacity_suggestion", 10))))
                    validated_suggestions.append(sug)
            
            return validated_suggestions if validated_suggestions else []
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {e}")
            print(f"Response content: {content}")
            return []
            
    except Exception as e:
        print(f"OpenAI API error: {e}")
        raise Exception(f"Failed to generate event suggestions: {str(e)}")

async def refine_text(
    text: str,
    context: Optional[str] = None,
    field_type: str = "general"
) -> str:
    """
    Refine and polish user-written text using AI.
    
    Args:
        text: The text to refine
        context: Optional context (e.g., event type, field of study)
        field_type: Type of field being refined (title, description, etc.)
    
    Returns:
        Refined, polished version of the text
    """
    client = get_openai_client()
    
    # Build context-aware prompt with explicit instructions
    if field_type == "title":
        instruction = """You are a creative copywriter specializing in study group titles. 

CRITICAL RULES:
1. Analyze the user's EXACT text - what subject/topic are they mentioning?
2. Keep their specific subject matter and core idea
3. Make it more catchy, memorable, and engaging
4. Use creative wordplay, alliteration, or compelling phrases when appropriate
5. Keep it under 80 characters
6. NEVER use generic templates like "Master X for Y Success" - be creative and unique
7. Each refinement should be different and creative

Examples of GOOD refinements:
- User: "study session for geography" → "Geography Deep Dive: Explore the World Together"
- User: "math practice group" → "Math Mastery Circle: Solve, Learn, Excel"
- User: "coding bootcamp prep" → "Code & Conquer: Bootcamp Prep Sessions"

Examples of BAD (generic template) refinements:
- "Master Geography for Exam Success: Study Session!" (too template-like)
- "Join us for an engaging geography study session" (generic)"""
    elif field_type == "description":
        instruction = """You are a creative copywriter specializing in study group descriptions.

CRITICAL RULES:
1. Read the user's EXACT text carefully - what are they actually saying?
2. Keep their specific details, topics, and goals
3. Make it more engaging, dynamic, and compelling
4. Use varied sentence structures and creative phrasing
5. Add energy and enthusiasm while keeping their core message
6. 2-4 sentences, natural flow
7. NEVER use generic templates - each description should be unique and creative
8. Vary your approach - sometimes be direct, sometimes be inspiring, sometimes be practical

Examples of GOOD refinements:
- User: "we study geography together" → "Dive deep into geography with a community of learners. We'll explore maps, cultures, and key concepts through interactive sessions that make studying engaging and effective."
- User: "math help group" → "Transform your math skills through collaborative problem-solving. Whether you're tackling algebra or calculus, we'll work through challenges together and build confidence step by step."

Examples of BAD (generic template) refinements:
- "Join us for an engaging geography study session designed to enhance your exam preparation..." (too generic and template-like)
- "Connect with peers, deepen your understanding, and boost your confidence" (overused phrases)"""
    else:
        instruction = """You are a creative text refinement expert.

CRITICAL RULES:
1. Analyze the user's EXACT text - what are they really trying to say?
2. Keep their specific content, details, and intent
3. Improve word choice, sentence flow, and engagement
4. Be creative and varied - no generic templates
5. Make it more polished while preserving their voice and message"""
    
    # Add some randomness to prompt to get different results each time
    import random
    style_hints = [
        "Use creative wordplay and make it memorable",
        "Be direct and action-oriented",
        "Create intrigue and curiosity",
        "Use inspiring, motivational language",
        "Be conversational and friendly",
        "Make it specific and detailed"
    ]
    style_hint = random.choice(style_hints)
    
    prompt = f"""{instruction}

User's original text:
"{text}"

CRITICAL: Read ONLY the user's text above. Do NOT add any topics, subjects, or references that are NOT explicitly mentioned in their text.

If the user writes about "football" - refine it about football, NOT about tests or exams.
If the user writes about "math" - refine it about math, NOT about other subjects.
If the user writes about "geography" - refine it about geography, NOT about exams they didn't mention.

Your task: 
- Read ONLY what the user actually wrote
- Identify their EXACT topic and subject matter from their text
- Refine it creatively while keeping their EXACT subject matter
- {style_hint}
- DO NOT add references to tests, exams, or subjects they didn't mention
- DO NOT infer or assume topics - only work with what they explicitly wrote
- Make it unique and tailored to their specific text

Think like a creative copywriter. Return ONLY the refined text. No quotes, no explanations."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",  # Using gpt-4o for better creativity and understanding
            messages=[
                {
                    "role": "system",
                    "content": "You are a creative text refinement assistant. You analyze the user's specific text and improve it creatively while keeping their core message. You NEVER use generic templates. Each refinement is unique, creative, and tailored to their exact content. Return only the refined text, nothing else."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=1.2,  # Higher temperature for maximum creativity and variation
            max_tokens=500
        )
        
        refined_text = response.choices[0].message.content.strip()
        
        # Remove quotes if the AI wrapped it
        if refined_text.startswith('"') and refined_text.endswith('"'):
            refined_text = refined_text[1:-1]
        elif refined_text.startswith("'") and refined_text.endswith("'"):
            refined_text = refined_text[1:-1]
        
        return refined_text
        
    except Exception as e:
        print(f"OpenAI API error during text refinement: {e}")
        raise Exception(f"Failed to refine text: {str(e)}")

