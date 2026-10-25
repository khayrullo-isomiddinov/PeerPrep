"""Tests for authentication endpoints"""
from fastapi import status


def test_register_success(client):
    """Test successful user registration"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "securepassword123"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "message" in data
    assert "Account created" in data["message"]


def test_register_duplicate_email(client, test_user):
    """Test registration with duplicate email"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": test_user.email,
            "password": "somepassword123"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in response.json()["detail"].lower()


def test_register_invalid_email(client):
    """Test registration with invalid email"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "notanemail",
            "password": "password123"
        }
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_login_success(client, test_user):
    """Test successful login"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "testpassword123"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["email"] == test_user.email
    assert data["user"]["id"] == test_user.id


def test_login_wrong_password(client, test_user):
    """Test login with wrong password"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "wrongpassword"
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "incorrect email or password" in response.json()["detail"].lower()


def test_login_unverified_user(client, test_user_unverified):
    """Test login with unverified user"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user_unverified.email,
            "password": "testpassword123"
        }
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "verify your email" in response.json()["detail"].lower()


def test_login_nonexistent_user(client):
    """Test login with non-existent user"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "somepassword123"
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "incorrect email or password" in response.json()["detail"].lower()


def test_get_me(client, auth_headers, test_user):
    """Test getting current user profile"""
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_user.id
    assert data["email"] == test_user.email
    assert data["name"] == test_user.name


def test_get_me_no_auth(client):
    """Test getting profile without authentication"""
    response = client.get("/api/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_me_invalid_token(client):
    """Test getting profile with invalid token"""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid_token_here"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_user_profile(client, test_user):
    """Test getting user profile by ID (public endpoint)"""
    response = client.get(f"/api/auth/user/{test_user.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_user.id
    # Public profiles never include the email address
    assert "email" not in data


def test_get_user_profile_not_found(client):
    """Test getting non-existent user profile"""
    response = client.get("/api/auth/user/99999")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_profile(client, auth_headers, test_user, session):
    """Test updating user profile"""
    response = client.put(
        "/api/auth/profile",
        headers=auth_headers,
        json={
            "name": "Updated Name",
            "bio": "Updated bio"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["bio"] == "Updated bio"
    # Verify in database
    session.refresh(test_user)
    assert test_user.name == "Updated Name"
    assert test_user.bio == "Updated bio"

