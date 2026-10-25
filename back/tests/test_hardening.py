"""Production hardening: rate limits, security headers, input validation and private emails."""
import json

import pytest
from fastapi import WebSocketDisconnect, status

from app.core import rate_limit
from app.core.security import create_access_token
from tests.conftest import ws_auth


def _login(client, email, password):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_security_headers_on_api_responses(client):
    headers = client.get("/api/health").headers
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["x-frame-options"] == "DENY"
    assert headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "frame-ancestors 'none'" in headers["content-security-policy"]


def test_account_locks_after_repeated_wrong_passwords(client, test_user):
    for _ in range(10):
        assert _login(client, test_user.email, "wrong-password").status_code == 401
    # Locked: even the right password gets 429, so the lock doesn't leak whether a guess was right
    response = _login(client, test_user.email, "testpassword123")
    assert response.status_code == 429
    assert "retry-after" in response.headers


def test_successful_login_clears_failures(client, test_user):
    for _ in range(5):
        _login(client, test_user.email, "wrong-password")
    assert _login(client, test_user.email, "testpassword123").status_code == 200
    rate_limit.reset("login:ip:testclient")  # only the per-account counter is under test here
    for _ in range(9):
        assert _login(client, test_user.email, "wrong-password").status_code == 401


def test_register_is_rate_limited_per_ip(client):
    codes = [
        client.post("/api/auth/register", json={"email": f"user{i}@example.com", "password": "longenough1"}).status_code
        for i in range(6)
    ]
    assert codes[:5] == [200] * 5
    assert codes[5] == 429


def test_oversized_request_is_refused(client):
    response = client.post("/api/events", content=b"{}", headers={"content-length": str(100 * 1024 * 1024)})
    assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE


@pytest.mark.parametrize("photo", [
    "javascript:alert(1)",
    "http://tracker.example.com/pixel.gif",
    "data:text/html;base64,PHNjcmlwdD4=",
])
def test_profile_photo_must_be_an_image(client, auth_headers, photo):
    response = client.put("/api/auth/profile", json={"photo_url": photo}, headers=auth_headers)
    assert response.status_code == 422


def test_profile_photo_accepts_uploaded_image(client, auth_headers):
    photo = "data:image/png;base64,iVBORw0KGgo="
    response = client.put("/api/auth/profile", json={"photo_url": photo}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["photo_url"] == photo


def _event_payload(**extra):
    from datetime import datetime, timedelta, timezone
    starts = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    return {"title": "Calculus", "starts_at": starts, "location": "Library", "capacity": 5, "duration": 2, **extra}


def test_study_materials_reject_script_links(client, auth_headers):
    materials = json.dumps([{"name": "notes.pdf", "type": "application/pdf", "size": 3, "data": "javascript:alert(1)"}])
    response = client.post("/api/events", json=_event_payload(study_materials=materials), headers=auth_headers)
    assert response.status_code == 422


def test_study_materials_accept_uploaded_files(client, auth_headers):
    materials = json.dumps([{"name": "notes.pdf", "type": "application/pdf", "size": 3, "data": "data:application/pdf;base64,JVBERg=="}])
    response = client.post("/api/events", json=_event_payload(study_materials=materials), headers=auth_headers)
    assert response.status_code == 201


def test_event_description_length_is_capped(client, auth_headers):
    response = client.post("/api/events", json=_event_payload(description="x" * 5001), headers=auth_headers)
    assert response.status_code == 422


def test_list_limit_is_bounded(client):
    assert client.get("/api/events?limit=100000").status_code == 422


def test_websocket_token_in_url_is_not_accepted(client, test_event, test_user):
    token = create_access_token(str(test_user.id), 5)
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/api/events/{test_event.id}/ws?token={token}") as ws:
            ws.receive_json()


def test_chat_never_shares_email_addresses(client, test_event, test_user):
    token = create_access_token(str(test_user.id), 5)
    with client.websocket_connect(f"/api/events/{test_event.id}/ws", subprotocols=ws_auth(token)) as ws:
        ws.receive_json()
        ws.send_json({"type": "message", "content": "hello"})
        message = ws.receive_json()["message"]
    assert "email" not in message["user"]
    assert test_user.email not in json.dumps(message)


def test_ai_helpers_need_sign_in(client):
    assert client.post("/api/events/refine-text", json={"text": "hi"}).status_code == 401
