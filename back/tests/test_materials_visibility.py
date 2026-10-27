"""Study materials are members-only: never in lists, and in a single event only for its members."""
import json
from datetime import datetime, timedelta, timezone

import pytest

from app.models import EventAttendee
from tests.test_event_listing import _auth, _user

MATERIALS = json.dumps([
    {"name": "notes.pdf", "type": "application/pdf", "size": 3, "data": "data:application/pdf;base64,JVBERg=="},
    {"name": "sheet.png", "type": "image/png", "size": 3, "data": "data:image/png;base64,iVBORw=="},
])


@pytest.fixture
def setup(client, session):
    owner = _user(session, "owner@example.com", "Owner")
    member = _user(session, "member@example.com", "Member")
    outsider = _user(session, "outsider@example.com", "Outsider")
    starts = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    response = client.post(
        "/api/events",
        json={"title": "Organic chemistry", "starts_at": starts, "location": "Library", "study_materials": MATERIALS},
        headers=_auth(owner),
    )
    assert response.status_code == 201
    event_id = response.json()["id"]
    session.add(EventAttendee(event_id=event_id, user_id=member.id))
    session.commit()
    return {"owner": owner, "member": member, "outsider": outsider, "event_id": event_id}


def test_owner_gets_materials_back_on_create(client, setup):
    detail = client.get(f"/api/events/{setup['event_id']}", headers=_auth(setup["owner"])).json()
    assert detail["study_materials"] == MATERIALS
    assert detail["materials_count"] == 2


def test_member_sees_materials(client, setup):
    detail = client.get(f"/api/events/{setup['event_id']}", headers=_auth(setup["member"])).json()
    assert json.loads(detail["study_materials"])[0]["name"] == "notes.pdf"


@pytest.mark.parametrize("who", ["outsider", "anonymous"])
def test_non_members_only_see_how_many_files_exist(client, setup, who):
    headers = _auth(setup["outsider"]) if who == "outsider" else {}
    response = client.get(f"/api/events/{setup['event_id']}", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["study_materials"] is None
    assert body["materials_count"] == 2
    assert "base64" not in response.text


@pytest.mark.parametrize("path", ["/api/events", "/api/events?status=all", "/api/events/my-events"])
def test_lists_never_include_materials(client, setup, path):
    response = client.get(path, headers=_auth(setup["member"]))
    assert response.status_code == 200
    assert response.json(), "the event should be listed"
    assert all(e["study_materials"] is None for e in response.json())
    assert "base64" not in response.text


def test_owner_can_still_edit_after_reading_materials(client, setup):
    response = client.patch(f"/api/events/{setup['event_id']}", json={"title": "Organic chemistry II"}, headers=_auth(setup["owner"]))
    assert response.status_code == 200
    assert response.json()["study_materials"] == MATERIALS


def test_sort_soonest_orders_by_start_time(client, session):
    owner = _user(session, "host@example.com", "Host")
    for title, days in (("Later", 5), ("Sooner", 1), ("Middle", 3)):
        starts = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        assert client.post("/api/events", json={"title": title, "starts_at": starts, "location": "Lab"}, headers=_auth(owner)).status_code == 201
    soonest = [e["title"] for e in client.get("/api/events?sort=soonest").json()]
    newest = [e["title"] for e in client.get("/api/events").json()]
    assert soonest == ["Sooner", "Middle", "Later"]
    assert newest == ["Middle", "Sooner", "Later"]
    assert client.get("/api/events?sort=random").status_code == 422
