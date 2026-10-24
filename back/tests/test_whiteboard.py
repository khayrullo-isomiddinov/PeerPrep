"""Tests for the shared event whiteboard WebSocket"""
import pytest
from datetime import datetime, timezone, timedelta
from fastapi import WebSocketDisconnect
from sqlmodel import select
from app.models import User, Event, EventAttendee, WhiteboardElement
from app.core.security import hash_password


def _token(client, email):
    response = client.post("/api/auth/login", json={"email": email, "password": "testpassword123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def _make_user(session, email, name):
    user = User(email=email, hashed_password=hash_password("testpassword123"), is_verified=True, name=name)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def attendee(session, test_event):
    user = _make_user(session, "attendee@example.com", "Attendee")
    session.add(EventAttendee(event_id=test_event.id, user_id=user.id))
    session.commit()
    return user


def _url(event_id, token):
    return f"/api/events/{event_id}/whiteboard/ws?token={token}"


STROKE = {"id": "el-1", "type": "stroke", "color": "#111827", "width": 4, "points": [[0, 0], [10, 10]]}


def test_rejects_missing_token(client, test_event):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/api/events/{test_event.id}/whiteboard/ws") as ws:
            ws.receive_json()


def test_rejects_non_member(client, session, test_event):
    _make_user(session, "outsider@example.com", "Outsider")
    token = _token(client, "outsider@example.com")
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(_url(test_event.id, token)) as ws:
            ws.receive_json()


def test_owner_receives_initial_state(client, test_user, test_event):
    token = _token(client, test_user.email)
    with client.websocket_connect(_url(test_event.id, token)) as ws:
        init = ws.receive_json()
        assert init["type"] == "init"
        assert init["elements"] == []
        assert init["is_owner"] is True
        assert init["read_only"] is False
        assert init["you"]["id"] == test_user.id


def test_upsert_is_persisted_and_broadcast(client, session, test_user, test_event, attendee):
    owner_token = _token(client, test_user.email)
    attendee_token = _token(client, attendee.email)

    with client.websocket_connect(_url(test_event.id, owner_token)) as owner_ws:
        owner_ws.receive_json()  # init
        with client.websocket_connect(_url(test_event.id, attendee_token)) as attendee_ws:
            init = attendee_ws.receive_json()
            assert init["is_owner"] is False
            assert [u["id"] for u in init["users"]] == [test_user.id]
            assert owner_ws.receive_json()["type"] == "user_joined"

            attendee_ws.send_json({"type": "upsert", "elements": [STROKE]})
            msg = owner_ws.receive_json()
            assert msg["type"] == "upsert"
            assert msg["user_id"] == attendee.id
            assert msg["elements"] == [STROKE]

            moved = {**STROKE, "points": [[5, 5], [15, 15]]}
            owner_ws.send_json({"type": "upsert", "elements": [moved]})
            assert attendee_ws.receive_json()["elements"] == [moved]

            rows = session.exec(select(WhiteboardElement).where(WhiteboardElement.event_id == test_event.id)).all()
            assert len(rows) == 1
            assert rows[0].created_by == attendee.id

            owner_ws.send_json({"type": "delete", "ids": ["el-1"]})
            assert attendee_ws.receive_json() == {"type": "delete", "user_id": test_user.id, "ids": ["el-1"]}

    session.expire_all()
    assert session.exec(select(WhiteboardElement)).all() == []


def test_invalid_elements_are_ignored(client, session, test_user, test_event):
    token = _token(client, test_user.email)
    with client.websocket_connect(_url(test_event.id, token)) as ws:
        ws.receive_json()
        ws.send_json({"type": "upsert", "elements": [{"id": "x", "type": "script"}, {"type": "stroke"}]})
        ws.send_json({"type": "upsert", "elements": [STROKE]})
        ws.send_json({"type": "cursor", "x": 1, "y": 2})  # round-trip marker: no echo, just ordering
    rows = session.exec(select(WhiteboardElement)).all()
    assert [r.element_id for r in rows] == ["el-1"]


def test_only_owner_can_clear(client, session, test_user, test_event, attendee):
    attendee_token = _token(client, attendee.email)
    with client.websocket_connect(_url(test_event.id, attendee_token)) as ws:
        ws.receive_json()
        ws.send_json({"type": "upsert", "elements": [STROKE]})
        ws.send_json({"type": "clear"})
        error = ws.receive_json()
        assert error["type"] == "error"
    assert len(session.exec(select(WhiteboardElement)).all()) == 1

    owner_token = _token(client, test_user.email)
    with client.websocket_connect(_url(test_event.id, owner_token)) as ws:
        assert len(ws.receive_json()["elements"]) == 1
        ws.send_json({"type": "clear"})
        ws.send_json({"type": "cursor", "x": 0, "y": 0})
    session.expire_all()
    assert session.exec(select(WhiteboardElement)).all() == []


def test_past_event_is_read_only(client, session, test_user):
    past = Event(
        title="Past", location="Somewhere", capacity=5, duration=1, created_by=test_user.id,
        starts_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    session.add(past)
    session.commit()
    session.refresh(past)

    token = _token(client, test_user.email)
    with client.websocket_connect(_url(past.id, token)) as ws:
        assert ws.receive_json()["read_only"] is True
        ws.send_json({"type": "upsert", "elements": [STROKE]})
        assert ws.receive_json()["type"] == "error"
    assert session.exec(select(WhiteboardElement)).all() == []


def test_deleting_event_removes_whiteboard(client, session, auth_headers, test_event):
    session.add(WhiteboardElement(event_id=test_event.id, element_id="a", data="{}", created_by=test_event.created_by))
    session.commit()
    response = client.delete(f"/api/events/{test_event.id}", headers=auth_headers)
    assert response.status_code in (200, 204)
    assert session.exec(select(WhiteboardElement)).all() == []
