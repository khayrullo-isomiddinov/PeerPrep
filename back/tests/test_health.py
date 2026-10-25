"""Tests for health check endpoints"""
from fastapi import status


def test_health_endpoint(client):
    """Test the basic health check endpoint"""
    response = client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


def test_readiness_checks_database(client):
    response = client.get("/api/health/ready")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok", "database": "up"}


def test_ai_health_endpoint_is_gone(client):
    # It made a paid OpenAI call for any anonymous visitor
    assert client.get("/api/health/ai").status_code == status.HTTP_404_NOT_FOUND

