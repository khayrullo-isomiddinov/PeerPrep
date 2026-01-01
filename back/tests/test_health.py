"""Tests for health check endpoints"""
from fastapi import status


def test_health_endpoint(client):
    """Test the basic health check endpoint"""
    response = client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


def test_health_ai_endpoint(client):
    """Test the AI health check endpoint (may fail if OpenAI not configured)"""
    response = client.get("/api/health/ai")
    # Should return 200 even if AI is not connected
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "status" in data
    assert "ai" in data

