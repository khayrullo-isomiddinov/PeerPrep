"""Tests for security and authentication"""
from fastapi import status
from app.core.security import hash_password, verify_password, create_access_token, decode_token


def test_password_hashing():
    """Test password hashing and verification"""
    password = "testpassword123"
    hashed = hash_password(password)
    
    # Hashed password should be different from original
    assert hashed != password
    assert len(hashed) > 0
    
    # Should be able to verify the password
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_token_creation_and_decoding():
    """Test JWT token creation and decoding"""
    user_id = "123"
    token = create_access_token(user_id, 60)
    
    # Token should be a string
    assert isinstance(token, str)
    assert len(token) > 0
    
    # Should be able to decode the token
    payload = decode_token(token)
    assert payload["sub"] == user_id
    assert "exp" in payload


def test_invalid_token(client):
    """Test accessing protected endpoint with invalid token"""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid_token_12345"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_missing_auth_header(client):
    """Test accessing protected endpoint without auth header"""
    response = client.get("/api/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_malformed_auth_header(client):
    """Test accessing protected endpoint with malformed auth header"""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "NotBearer token123"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_token_expiration(client, test_user, session):
    """Test that expired tokens are rejected"""
    from datetime import timedelta
    from app.core.config import settings
    
    # Create a token with very short expiration (negative to ensure expired)
    expired_token = create_access_token(str(test_user.id), -1)
    
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_token_for_nonexistent_user(client, session):
    """Test token for user that no longer exists"""
    from app.core.security import create_access_token
    
    # Create token for user ID that doesn't exist
    fake_user_id = 99999
    token = create_access_token(str(fake_user_id), 60)
    
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

