"""AI service for OpenAI integration"""
from openai import OpenAI
from app.core.config import settings
from typing import Optional

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
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a creative text refinement assistant. You analyze the user's specific text and improve it creatively while keeping their core message. You NEVER use generic templates. Each refinement is unique, creative, and tailored to their exact content. Return only the refined text, nothing else."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=1.2,
            max_tokens=500
        )
        
        refined_text = response.choices[0].message.content.strip()
        
        if refined_text.startswith('"') and refined_text.endswith('"'):
            refined_text = refined_text[1:-1]
        elif refined_text.startswith("'") and refined_text.endswith("'"):
            refined_text = refined_text[1:-1]
        
        return refined_text
        
    except Exception as e:
        print(f"OpenAI API error during text refinement: {e}")
        raise Exception(f"Failed to refine text: {str(e)}")

async def generate_image(prompt: str) -> str:
    """
    Generate an image from a text prompt using OpenAI's DALL-E API.
    
    Args:
        prompt: The text description of the image to generate
        
    Returns:
        Base64-encoded image data URL (data:image/png;base64,...)
    """
    client = get_openai_client()
    
    enhanced_prompt = f"""Create a professional, engaging cover image for a study group or educational event. 
The image should be: modern, clean, visually appealing, suitable for a study platform, and represent: {prompt}.
Style: professional, educational, inspiring, with good composition and colors that work well as a cover image."""
    
    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt=enhanced_prompt,
            size="1024x1024",
            quality="standard",
            n=1,
            response_format="b64_json"
        )
        
        image_b64 = response.data[0].b64_json
        
        return f"data:image/png;base64,{image_b64}"
        
    except Exception as e:
        print(f"OpenAI DALL-E API error: {e}")
        raise Exception(f"Failed to generate image: {str(e)}")

