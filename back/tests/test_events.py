"""Tests for events endpoints"""
from fastapi import status
from datetime import datetime, timezone, timedelta
from sqlmodel import select


def test_create_event(client, auth_headers, test_user, session):
    """Test creating an event"""
    future_time = datetime.now(timezone.utc) + timedelta(days=1, hours=2)
    response = client.post(
        "/api/events",
        headers=auth_headers,
        json={
            "title": "New Test Event",
            "description": "A new test event",
            "location": "Test Location",
            "starts_at": future_time.isoformat(),
            "capacity": 20,
            "duration": 2
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "New Test Event"
    assert data["location"] == "Test Location"
    assert data["created_by"] == test_user.id
    assert "id" in data
    assert "status" in data


def test_create_event_invalid_capacity(client, auth_headers):
    """Test creating an event with invalid capacity"""
    future_time = datetime.now(timezone.utc) + timedelta(days=1)
    response = client.post(
        "/api/events",
        headers=auth_headers,
        json={
            "title": "Test Event",
            "location": "Test Location",
            "starts_at": future_time.isoformat(),
            "capacity": 0  # Invalid
        }
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_create_event_no_auth(client):
    """Test creating an event without authentication"""
    future_time = datetime.now(timezone.utc) + timedelta(days=1)
    response = client.post(
        "/api/events",
        json={
            "title": "Test Event",
            "location": "Test Location",
            "starts_at": future_time.isoformat()
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_event(client, test_event):
    """Test getting an event by ID"""
    response = client.get(f"/api/events/{test_event.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_event.id
    assert data["title"] == test_event.title
    assert "status" in data
    assert "attendee_count" in data


def test_get_event_not_found(client):
    """Test getting non-existent event"""
    response = client.get("/api/events/99999")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_list_events(client, test_event):
    """Test listing events"""
    response = client.get("/api/events?status=upcoming")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    # Should contain our test event
    event_ids = [e["id"] for e in data]
    assert test_event.id in event_ids


def test_list_events_with_query(client, test_event):
    """Test listing events with search query"""
    response = client.get("/api/events?q=Test&status=upcoming")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    # Should find events matching "Test"
    event_titles = [e["title"] for e in data]
    assert any("Test" in title for title in event_titles)


def test_list_events_with_auth(client, auth_headers, test_event, test_user, session):
    """Test listing events while authenticated (includes is_joined)"""
    response = client.get("/api/events?status=upcoming", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    # Find our test event in the list
    event = next((e for e in data if e["id"] == test_event.id), None)
    assert event is not None
    assert "is_joined" in event
    # Creator should be joined
    assert event["is_joined"] is True


def test_update_event(client, auth_headers, test_event, session):
    """Test updating an event"""
    future_time = datetime.now(timezone.utc) + timedelta(days=2)
    response = client.patch(
        f"/api/events/{test_event.id}",
        headers=auth_headers,
        json={
            "title": "Updated Event Title",
            "description": "Updated description"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Updated Event Title"
    assert data["description"] == "Updated description"
    # Verify in database
    session.refresh(test_event)
    assert test_event.title == "Updated Event Title"


def test_update_event_not_owner(client, auth_headers, test_event, session, test_user):
    """Test updating an event as non-owner (should fail)"""
    # Create another user
    from app.models import User
    from app.core.security import hash_password
    other_user = User(
        email="other@example.com",
        hashed_password=hash_password("password123"),
        is_verified=True
    )
    session.add(other_user)
    session.commit()
    session.refresh(other_user)
    
    # Login as other user
    login_response = client.post(
        "/api/auth/login",
        json={"email": other_user.email, "password": "password123"}
    )
    other_auth_headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }
    
    # Try to update event created by test_user
    response = client.patch(
        f"/api/events/{test_event.id}",
        headers=other_auth_headers,
        json={"title": "Unauthorized Update"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_event(client, auth_headers, test_event, session):
    """Test deleting an event"""
    event_id = test_event.id
    response = client.delete(
        f"/api/events/{event_id}",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify event is deleted
    from app.models import Event
    deleted_event = session.get(Event, event_id)
    assert deleted_event is None


def test_delete_event_not_owner(client, auth_headers, test_event, session, test_user):
    """Test deleting an event as non-owner (should fail)"""
    # Create another user
    from app.models import User
    from app.core.security import hash_password
    other_user = User(
        email="other2@example.com",
        hashed_password=hash_password("password123"),
        is_verified=True
    )
    session.add(other_user)
    session.commit()
    session.refresh(other_user)
    
    # Login as other user
    login_response = client.post(
        "/api/auth/login",
        json={"email": other_user.email, "password": "password123"}
    )
    other_auth_headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }
    
    # Try to delete event created by test_user
    response = client.delete(
        f"/api/events/{test_event.id}",
        headers=other_auth_headers
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_join_event(client, auth_headers, test_event, session, test_user):
    """Test joining an event"""
    # First, ensure user is not already an attendee (creator is auto-joined)
    # Create another user to join
    from app.models import User
    from app.core.security import hash_password
    joiner = User(
        email="joiner@example.com",
        hashed_password=hash_password("password123"),
        is_verified=True
    )
    session.add(joiner)
    session.commit()
    session.refresh(joiner)
    
    # Login as joiner
    login_response = client.post(
        "/api/auth/login",
        json={"email": joiner.email, "password": "password123"}
    )
    joiner_headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }
    
    # Join the event
    response = client.post(
        f"/api/events/{test_event.id}/join",
        headers=joiner_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert "attendee_count" in data
    
    # Verify attendee was added
    from app.models import EventAttendee
    attendee = session.exec(
        select(EventAttendee).where(
            EventAttendee.event_id == test_event.id,
            EventAttendee.user_id == joiner.id
        )
    ).first()
    assert attendee is not None


def test_leave_event(client, auth_headers, test_event, session, test_user):
    """Test leaving an event"""
    # Create a user who will join and then leave
    from app.models import User, EventAttendee
    from app.core.security import hash_password
    leaver = User(
        email="leaver@example.com",
        hashed_password=hash_password("password123"),
        is_verified=True
    )
    session.add(leaver)
    session.commit()
    session.refresh(leaver)
    
    # Add user as attendee
    attendee = EventAttendee(event_id=test_event.id, user_id=leaver.id)
    session.add(attendee)
    session.commit()
    
    # Login as leaver
    login_response = client.post(
        "/api/auth/login",
        json={"email": leaver.email, "password": "password123"}
    )
    leaver_headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }
    
    # Leave the event
    response = client.delete(
        f"/api/events/{test_event.id}/join",
        headers=leaver_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    
    # Verify attendee was removed
    attendee_check = session.exec(
        select(EventAttendee).where(
            EventAttendee.event_id == test_event.id,
            EventAttendee.user_id == leaver.id
        )
    ).first()
    assert attendee_check is None

