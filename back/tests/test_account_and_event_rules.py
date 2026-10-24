"""Tests for login/verification edge cases and event validation rules"""
from datetime import datetime, timezone, timedelta
from sqlmodel import select
from app.models import User, Event, EventAttendee, EventMessage, WhiteboardElement
from app.core.security import hash_password, verify_password


def _login(client, email, password="testpassword123"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def _headers(client, email):
    return {"Authorization": f"Bearer {_login(client, email).json()['access_token']}"}


def _make_user(session, email, verified=True):
    user = User(email=email, hashed_password=hash_password("testpassword123"), is_verified=verified, name=email.split("@")[0])
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


# ---------- accounts ----------

def test_login_is_case_insensitive(client, test_user):
    assert _login(client, "  TEST@Example.com ").status_code == 200


def test_register_rejects_short_password(client):
    response = client.post("/api/auth/register", json={"email": "short@example.com", "password": "abc"})
    assert response.status_code == 422
    assert "at least 8 characters" in str(response.json()["detail"])


def test_register_again_while_unverified_resends_link_and_keeps_password(client, session, test_user_unverified, no_real_emails):
    response = client.post("/api/auth/register", json={"email": test_user_unverified.email, "password": "a-different-password"})
    assert response.status_code == 200
    assert "not verified yet" in response.json()["message"]
    assert len(no_real_emails) == 1
    session.refresh(test_user_unverified)
    assert verify_password("testpassword123", test_user_unverified.hashed_password)


def test_verification_link_is_returned_when_email_fails(client, monkeypatch):
    def broken(**kwargs):
        raise RuntimeError("SMTP down")
    monkeypatch.setattr("app.api.version_one.auth.send_email", broken)
    response = client.post("/api/auth/register", json={"email": "nomail@example.com", "password": "longenough1"})
    data = response.json()
    assert data["email_sent"] is False
    assert "/api/auth/verify?token=" in data["verify_url"]


def test_resend_verification(client, session, test_user_unverified, test_user, no_real_emails):
    old_token = test_user_unverified.verification_token
    response = client.post("/api/auth/resend-verification", json={"email": test_user_unverified.email})
    assert response.status_code == 200
    session.refresh(test_user_unverified)
    assert test_user_unverified.verification_token != old_token
    assert len(no_real_emails) == 1

    assert client.post("/api/auth/resend-verification", json={"email": test_user.email}).json()["already_verified"] is True
    assert client.post("/api/auth/resend-verification", json={"email": "ghost@example.com"}).status_code == 404


def test_verify_redirects_to_login_page(client, session, test_user_unverified):
    test_user_unverified.verification_token = "tok123"
    session.add(test_user_unverified)
    session.commit()
    response = client.get("/api/auth/verify?token=tok123", follow_redirects=False)
    assert response.status_code == 303
    assert response.headers["location"].endswith("/login?verified=1")
    assert "#" not in response.headers["location"]
    session.refresh(test_user_unverified)
    assert test_user_unverified.is_verified
    assert _login(client, test_user_unverified.email).status_code == 200


def test_delete_account_removes_owned_events_and_memberships(client, session, test_user, test_event):
    other = _make_user(session, "other@example.com")
    other_event = Event(title="Other", location="X", starts_at=datetime.now(timezone.utc) + timedelta(days=3), created_by=other.id)
    session.add(other_event)
    session.commit()
    session.add(EventAttendee(event_id=other_event.id, user_id=test_user.id))
    session.add(EventMessage(event_id=test_event.id, user_id=other.id, content="hi"))
    session.commit()

    event_id, user_id, other_event_id = test_event.id, test_user.id, other_event.id
    response = client.delete("/api/auth/account", headers=_headers(client, test_user.email))
    assert response.status_code == 200
    session.expire_all()
    assert session.exec(select(Event).where(Event.id == event_id)).first() is None
    assert session.exec(select(EventMessage).where(EventMessage.event_id == event_id)).all() == []
    assert session.exec(select(EventAttendee).where(EventAttendee.user_id == user_id)).all() == []
    assert session.exec(select(Event).where(Event.id == other_event_id)).first() is not None


# ---------- events ----------

def _future(days=2):
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def test_create_event_rejects_past_start_and_blank_title(client, auth_headers):
    past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    response = client.post("/api/events", headers=auth_headers, json={"title": "Old", "location": "X", "starts_at": past})
    assert response.status_code == 422
    assert "future" in str(response.json()["detail"])

    response = client.post("/api/events", headers=auth_headers, json={"title": "   ", "location": "X", "starts_at": _future()})
    assert response.status_code == 422
    assert "Title is required" in str(response.json()["detail"])


def test_update_event_rules(client, session, auth_headers, test_event):
    for i in range(3):
        session.add(EventAttendee(event_id=test_event.id, user_id=_make_user(session, f"m{i}@example.com").id))
    session.commit()

    response = client.patch(f"/api/events/{test_event.id}", headers=auth_headers, json={"capacity": 2})
    assert response.status_code == 400
    assert "(4)" in response.json()["detail"]

    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    assert client.patch(f"/api/events/{test_event.id}", headers=auth_headers, json={"starts_at": past}).status_code == 422
    assert client.patch(f"/api/events/{test_event.id}", headers=auth_headers, json={"title": ""}).status_code == 422

    response = client.patch(f"/api/events/{test_event.id}", headers=auth_headers, json={"capacity": 4, "title": " Renamed "})
    assert response.status_code == 200
    assert response.json()["title"] == "Renamed"


def test_chat_history_is_members_only(client, session, test_event):
    _make_user(session, "outsider@example.com")
    response = client.get(f"/api/events/{test_event.id}/messages", headers=_headers(client, "outsider@example.com"))
    assert response.status_code == 403
    assert client.get(f"/api/events/{test_event.id}/messages").status_code == 401


def test_blank_messages_are_rejected(client, auth_headers, test_event):
    response = client.post(f"/api/events/{test_event.id}/messages?content=%20%20%20", headers=auth_headers)
    assert response.status_code == 400


def test_delete_event_removes_related_rows(client, session, auth_headers, test_user, test_event):
    session.add(EventMessage(event_id=test_event.id, user_id=test_user.id, content="hi"))
    session.add(EventAttendee(event_id=test_event.id, user_id=test_user.id))
    session.add(WhiteboardElement(event_id=test_event.id, element_id="a", data="{}", created_by=test_user.id))
    session.commit()

    assert client.delete(f"/api/events/{test_event.id}", headers=auth_headers).status_code == 204
    session.expire_all()
    assert session.exec(select(EventMessage)).all() == []
    assert session.exec(select(EventAttendee)).all() == []
    assert session.exec(select(WhiteboardElement)).all() == []
