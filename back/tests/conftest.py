"""
Pytest configuration and fixtures for testing
"""
import pytest
from sqlmodel import SQLModel, create_engine, Session
from datetime import datetime, timezone
import tempfile
import os

from app.models import User, Group, GroupMember, MissionSubmission, Event, EventAttendee, GroupMessage
from app.db import get_session


# Use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def test_engine():
    """Create a test database engine"""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(scope="function")
def test_session(test_engine):
    """Create a test database session"""
    with Session(test_engine) as session:
        yield session
        session.rollback()


@pytest.fixture
def sample_user(test_session):
    """Create a sample user for testing"""
    user = User(
        id=1,
        email="test@example.com",
        name="Test User",
        hashed_password="hashed",
        xp=0,
        is_verified=True
    )
    test_session.add(user)
    test_session.commit()
    test_session.refresh(user)
    return user


@pytest.fixture
def sample_group(test_session, sample_user):
    """Create a sample group for testing"""
    group = Group(
        id="test-group-1",
        name="Test Group",
        description="Test Description",
        field_of_study="Computer Science",
        created_by=sample_user.id
    )
    test_session.add(group)
    test_session.commit()
    test_session.refresh(group)
    
    # Add user as leader
    membership = GroupMember(
        group_id=group.id,
        user_id=sample_user.id,
        is_leader=True
    )
    test_session.add(membership)
    test_session.commit()
    
    return group


@pytest.fixture
def sample_submission(test_session, sample_user, sample_group):
    """Create a sample mission submission for testing"""
    submission = MissionSubmission(
        group_id=sample_group.id,
        user_id=sample_user.id,
        submission_url="https://example.com/submission",
        submission_text="This is a detailed submission with multiple sentences. It contains enough content to analyze quality and detail level.",
        submitted_at=datetime.now(timezone.utc),
        is_approved=False
    )
    test_session.add(submission)
    test_session.commit()
    test_session.refresh(submission)
    return submission


@pytest.fixture
def sample_event(test_session, sample_user):
    """Create a sample event for testing"""
    event = Event(
        id=1,
        title="Test Event",
        description="Test Event Description",
        location="Test Location",
        starts_at=datetime.now(timezone.utc),
        created_by=sample_user.id
    )
    test_session.add(event)
    test_session.commit()
    test_session.refresh(event)
    return event

