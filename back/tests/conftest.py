import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone, timedelta
from app.main import app
from app.core.db import get_session
from app.models import User, Event, EventAttendee
from app.core.security import hash_password


# Use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def test_engine():
    """Create a test database engine"""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Create all tables
    from app.models import User, Event, EventAttendee, EventMessage, MessageRead
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)

@pytest.fixture(scope="function")
def session(test_engine):
    """Create a test database session"""
    with Session(test_engine) as session:
        yield session

@pytest.fixture(scope="function")
def client(session):
    """Create a test client with overridden database dependency"""
    def override_get_session():
        yield session
    
    app.dependency_overrides[get_session] = override_get_session
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(session):
    """Create a test user"""
    user = User(
        email="test@example.com",
        hashed_password=hash_password("testpassword123"),
        is_verified=True,
        name="Test User"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@pytest.fixture
def test_user_unverified(session):
    """Create an unverified test user"""
    user = User(
        email="unverified@example.com",
        hashed_password=hash_password("testpassword123"),
        is_verified=False,
        name="Unverified User"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@pytest.fixture
def auth_headers(client, test_user):
    """Get authentication headers for a test user"""
    response = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "testpassword123"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_event(session, test_user):
    """Create a test event"""
    future_time = datetime.now(timezone.utc) + timedelta(days=1, hours=2)
    event = Event(
        title="Test Event",
        description="A test event",
        location="Test Location",
        starts_at=future_time,
        capacity=10,
        duration=2,
        created_by=test_user.id
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event



@pytest.fixture(autouse=True)
def no_real_emails(monkeypatch):
    """Never send real email from tests, even when SMTP is configured in .env"""
    sent = []

    def fake_send_email(to, subject, html):
        sent.append({"to": to, "subject": subject, "html": html})

    monkeypatch.setattr("app.api.version_one.auth.send_email", fake_send_email)
    return sent
