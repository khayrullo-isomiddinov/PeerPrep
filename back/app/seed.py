from datetime import datetime, timedelta
from sqlmodel import Session, select
from app.core.security import hash_password
from app.models import User, Group, Event, EventKind


def seed_db(session: Session) -> None:
    # Only seed if there are no users yet
    has_user = session.exec(select(User.id).limit(1)).first() is not None
    if has_user:
        print("Users already exist, skipping seeding")
        return

    # Users
    users = [
        User(email="alice@example.com", hashed_password=hash_password("password123"), is_verified=True),
        User(email="bob@example.com", hashed_password=hash_password("password123"), is_verified=True),
        User(email="carol@example.com", hashed_password=hash_password("password123"), is_verified=True),
    ]
    for u in users:
        session.add(u)
    session.commit()
    for u in users:
        session.refresh(u)

    # Study Groups (note: model uses string id, keep group_id None on events to avoid mismatch)
    groups = [
        Group(id="calisthenics-study", name="Calisthenics & Focus", field="Wellness/Productivity", exam=None, description="Daily calisthenics + deep work accountability", created_by=users[0].id),
        Group(id="algorithms-101", name="Algorithms 101", field="Computer Science", exam="Intro Algorithms Midterm", description="Greedy, DP, graphs – weekly problem sets", created_by=users[1].id),
        Group(id="ielts-prep", name="IELTS Prep Sprint", field="Languages", exam="IELTS", description="Speaking drills, writing feedback, mock tests", created_by=users[2].id),
    ]
    for g in groups:
        session.add(g)
    session.commit()

    # Events
    now = datetime.utcnow()
    events = [
        Event(
            title="Morning Calisthenics + Pomodoro",
            starts_at=now + timedelta(days=1, hours=9),
            location="Campus Green / Discord",
            capacity=12,
            description="20 min mobility + 2x50 min deep work",
            group_id=None,
            kind=EventKind.group,
            created_by=users[0].id,
        ),
        Event(
            title="Graph Algorithms Crash Session",
            starts_at=now + timedelta(days=2, hours=18),
            location="Library Room 3B",
            capacity=8,
            description="BFS/DFS, shortest paths, MST – whiteboard practice",
            group_id=None,
            kind=EventKind.one_off,
            created_by=users[1].id,
        ),
        Event(
            title="IELTS Speaking Mock",
            starts_at=now + timedelta(days=3, hours=16),
            location="Zoom",
            capacity=6,
            description="Part 1-3 timed rounds + peer feedback",
            group_id=None,
            kind=EventKind.group,
            created_by=users[2].id,
        ),
    ]
    for e in events:
        session.add(e)
    session.commit()
    
    print(f"Seeded {len(users)} users, {len(groups)} groups, and {len(events)} events")


