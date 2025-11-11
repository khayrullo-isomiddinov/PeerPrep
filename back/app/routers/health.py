from fastapi import APIRouter, HTTPException
from app.services.ai import test_connection

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}

@router.get("/health/ai")
async def test_ai_connection():
    """Test OpenAI API connection"""
    try:
        is_connected = await test_connection()
        if is_connected:
            return {"status": "ok", "ai": "connected"}
        else:
            return {"status": "error", "ai": "connection_failed"}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI test failed: {str(e)}")
