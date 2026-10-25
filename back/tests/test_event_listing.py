"""Event listing, status filters, counts and the chat WebSocket.

Written before splitting events.py, to pin down existing behaviour so the refactor can't change it.
"""
from datetime import datetime, timezone, timedelta

import pytest
from app.core.security import hash_password, create_access_token
from app.models import User, Event, EventAttendee, EventMessage


def _user(session, email, name):
    user = User(email=email, hashed_password=hash_password("testpassword123"), is_verified=True, name=name)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _event(session, owner, title, starts_in_hours, duration=2, capacity=10, owner_attends=True):
    evt = Event(
        title=title, location="Library", capacity=capacity, duration=duration, created_by=owner.id,
        starts_at=datetime.now(timezone.utc) + timedelta(hours=starts_in_hours),
    )
    session.add(evt)
    session.commit()
    session.refresh(evt)
    if owner_attends:
        session.add(EventAttendee(event_id=evt.id, user_id=owner.id))
        session.commit()
    return evt


def _auth(user):
    return {"Authorization": f"Bearer {create_access_token(str(user.id), 5)}"}


@pytest.fixture
def world(session):
    owner = _user(session, "owner@example.com", "Owner")
    member = _user(session, "member@example.com", "Member")
    outsider = _user(session, "outsider@example.com", "Outsider")
    upcoming = _event(session, owner, "Upcoming", starts_in_hours=24)
    ongoing = _event(session, owner, "Ongoing", starts_in_hours=-1)
    past = _event(session, owner, "Past", starts_in_hours=-5)
    # Created before the creator was auto-added as an attendee: the creator still counts
    legacy = _event(session, owner, "Legacy", starts_in_hours=48, owner_attends=False)
    for evt in (upcoming, ongoing, past):
        session.add(EventAttendee(event_id=evt.id, user_id=member.id))
    session.commit()
    return {"owner": owner, "member": member, "outsider": outsider,
            "upcoming": upcoming, "ongoing": ongoing, "past": past, "legacy": legacy}


def _titles(response):
    assert response.status_code == 200, response.text
    return sorted(e["title"] for e in response.json())


@pytest.mark.parametrize("status,expected", [
    ("upcoming", ["Legacy", "Upcoming"]),
    ("ongoing", ["Ongoing"]),
    ("past", ["Past"]),
    ("all", ["Legacy", "Ongoing", "Past", "Upcoming"]),
])
def test_list_filters_by_status(client, world, status, expected):
    assert _titles(client.get(f"/api/events?status={status}")) == expected


def test_list_rejects_unknown_status(client, world):
    assert client.get("/api/events?status=soon").status_code == 400


def test_list_status_fields_and_counts(client, world):
    events = {e["title"]: e for e in client.get("/api/events?status=all").json()}
    assert events["Ongoing"]["status"] == "ongoing" and events["Ongoing"]["is_ongoing"] is True
    assert events["Past"]["status"] == "past" and events["Past"]["is_past"] is True
    assert events["Upcoming"]["status"] == "upcoming" and events["Upcoming"]["is_upcoming"] is True
    assert events["Upcoming"]["attendee_count"] == 2
    assert events["Legacy"]["attendee_count"] == 1
    assert "is_joined" not in events["Upcoming"]


def test_list_is_joined_for_signed_in_user(client, world):
    as_member = {e["title"]: e["is_joined"] for e in client.get("/api/events?status=all", headers=_auth(world["member"])).json()}
    assert as_member == {"Upcoming": True, "Ongoing": True, "Past": True, "Legacy": False}
    as_owner = {e["title"]: e["is_joined"] for e in client.get("/api/events?status=all", headers=_auth(world["owner"])).json()}
    assert all(as_owner.values())


def test_get_event_counts_and_membership(client, world):
    eid = world["upcoming"].id
    assert client.get(f"/api/events/{eid}").json()["attendee_count"] == 2
    data = client.get(f"/api/events/{eid}", headers=_auth(world["outsider"])).json()
    assert data["attendee_count"] == 2 and data["is_joined"] is False
    assert client.get(f"/api/events/{world['legacy'].id}", headers=_auth(world["owner"])).json()["attendee_count"] == 1


@pytest.mark.parametrize("status,expected", [
    ("upcoming", ["Legacy", "Upcoming"]),
    ("ongoing", ["Ongoing"]),
    ("past", ["Past"]),
    ("all", ["Legacy", "Ongoing", "Past", "Upcoming"]),
])
def test_my_events_and_count(client, world, status, expected):
    headers = _auth(world["owner"])
    assert _titles(client.get(f"/api/events/my-events?status={status}", headers=headers)) == expected
    assert client.get(f"/api/events/my-events/count?status={status}", headers=headers).json() == {"count": len(expected)}


def test_my_events_for_member_and_outsider(client, world):
    assert _titles(client.get("/api/events/my-events?status=all", headers=_auth(world["member"]))) == ["Ongoing", "Past", "Upcoming"]
    assert client.get("/api/events/my-events?status=all", headers=_auth(world["outsider"])).json() == []
    mine = client.get("/api/events/my-events?status=upcoming", headers=_auth(world["member"])).json()
    assert mine[0]["is_joined"] is True and mine[0]["attendee_count"] == 2


def test_join_rules(client, session, world):
    outsider = _auth(world["outsider"])
    assert client.post(f"/api/events/{world['ongoing'].id}/join", headers=outsider).status_code == 400
    full = _event(session, world["owner"], "Full", starts_in_hours=10, capacity=2)
    session.add(EventAttendee(event_id=full.id, user_id=world["member"].id))
    session.commit()
    response = client.post(f"/api/events/{full.id}/join", headers=outsider)
    assert response.status_code == 409 and response.json()["detail"] == "Event is full"
    again = client.post(f"/api/events/{world['upcoming'].id}/join", headers=_auth(world["member"])).json()
    assert again["alreadyJoined"] is True and again["attendee_count"] == 2


def test_leave_updates_count(client, world):
    response = client.delete(f"/api/events/{world['upcoming'].id}/join", headers=_auth(world["member"]))
    assert response.json() == {"success": True, "attendee_count": 1}
    response = client.delete(f"/api/events/{world['upcoming'].id}/join", headers=_auth(world["member"]))
    assert response.json()["notJoined"] is True


def test_attendee_details_include_owner(client, world):
    details = client.get(f"/api/events/{world['legacy'].id}/attendees/details").json()
    assert [d["email"] for d in details] == ["owner@example.com"]
    ids = client.get(f"/api/events/{world['upcoming'].id}/attendees").json()
    assert sorted(ids) == sorted([world["owner"].id, world["member"].id])


def test_presence_and_typing(client, world):
    eid = world["upcoming"].id
    headers = _auth(world["member"])
    assert client.post(f"/api/events/{eid}/typing", headers=headers).json() == {"status": "typing"}
    presence = client.get(f"/api/events/{eid}/presence", headers=_auth(world["owner"])).json()["presence"]
    assert {p["id"]: p["is_online"] for p in presence}[world["member"].id] is True
    assert client.post(f"/api/events/{eid}/typing", headers=_auth(world["outsider"])).status_code == 403


def test_message_rest_flow(client, session, world):
    eid = world["upcoming"].id
    member = _auth(world["member"])
    posted = client.post(f"/api/events/{eid}/messages?content=Hello", headers=member).json()
    assert posted["content"] == "Hello"
    listed = client.get(f"/api/events/{eid}/messages", headers=_auth(world["owner"])).json()
    assert [m["content"] for m in listed] == ["Hello"] and listed[0]["is_read_by_me"] is False
    assert client.post(f"/api/events/{eid}/messages/{posted['id']}/read", headers=_auth(world["owner"])).json() == {"status": "read"}
    assert client.get(f"/api/events/{eid}/messages", headers=_auth(world["owner"])).json()[0]["is_read_by_me"] is True
    assert client.delete(f"/api/events/{eid}/messages/{posted['id']}", headers=_auth(world["owner"])).status_code == 403
    assert client.delete(f"/api/events/{eid}/messages/{posted['id']}", headers=member).status_code == 200
    assert client.get(f"/api/events/{eid}/messages", headers=member).json()[0]["is_deleted"] is True


def test_chat_websocket_protocol(client, world):
    eid = world["upcoming"].id
    owner_token = create_access_token(str(world["owner"].id), 5)
    member_token = create_access_token(str(world["member"].id), 5)
    with client.websocket_connect(f"/api/events/{eid}/ws?token={owner_token}") as owner_ws:
        assert owner_ws.receive_json()["type"] == "initial_messages"
        with client.websocket_connect(f"/api/events/{eid}/ws?token={member_token}") as member_ws:
            assert member_ws.receive_json()["type"] == "initial_messages"
            joined = owner_ws.receive_json()
            assert joined["type"] == "user_joined" and joined["user_id"] == world["member"].id

            member_ws.send_json({"type": "presence_ping"})
            assert member_ws.receive_json() == {"type": "presence_update", "online_users": [world["owner"].id]}

            member_ws.send_json({"type": "typing"})
            assert owner_ws.receive_json() == {"type": "typing", "user_id": world["member"].id, "user_name": "Member"}

            owner_ws.send_json({"type": "message", "content": "Hi all"})
            mine, theirs = owner_ws.receive_json(), member_ws.receive_json()
            assert mine["type"] == theirs["type"] == "new_message"
            assert theirs["message"]["content"] == "Hi all" and theirs["message"]["user"]["id"] == world["owner"].id

            member_ws.send_json({"type": "mark_read", "message_id": theirs["message"]["id"]})
            assert owner_ws.receive_json()["type"] == "message_read"
        assert owner_ws.receive_json() == {"type": "user_left", "user_id": world["member"].id}


def test_chat_websocket_rejects_outsiders(client, world):
    from fastapi import WebSocketDisconnect
    token = create_access_token(str(world["outsider"].id), 5)
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/api/events/{world['upcoming'].id}/ws?token={token}") as ws:
            ws.receive_json()


def test_chat_is_read_only_after_event(client, session, world):
    token = create_access_token(str(world["member"].id), 5)
    with client.websocket_connect(f"/api/events/{world['past'].id}/ws?token={token}") as ws:
        ws.receive_json()
        ws.send_json({"type": "message", "content": "too late"})
        assert ws.receive_json()["type"] == "error"
    session.expire_all()
    assert session.query(EventMessage).count() == 0
