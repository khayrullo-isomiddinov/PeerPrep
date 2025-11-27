"""
Minimal Database Seeder
Seeds only:
- Admin user
- Sample events WITH cover images
"""
from datetime import datetime, timedelta, timezone
import random
from sqlmodel import Session, select
from app.core.security import hash_password
from app.models import User, Event
from app.core.config import settings

COVER_IMAGES = [
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop&q=80",
]


def seed_db(session: Session):
    """Seed admin + demo events."""

    admin = session.exec(
        select(User).where(User.email == settings.ADMIN_EMAIL)
    ).first()

    if not admin:
        admin = User(
            email=settings.ADMIN_EMAIL,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            name="Khayrullo Isomiddinov",
            is_verified=True,
            xp=0,
        )
        session.add(admin)
        session.commit()
        session.refresh(admin)

    if session.exec(select(Event)).first():
        print("✓ Seed skipped: events already exist")
        return

    now = datetime.now(timezone.utc)

    rng = random.Random(42)

    sample_events = [
        ("Welcome to PeerPrep", "Kickoff event for new users", "Budapest, Hungary"),
        ("Study Session", "Silent coworking & focus", "ELTE Library, Budapest"),
        ("Coding Meetup", "Solve problems together", "BME Library, Budapest"),
        ("Math Revision", "Study calculus & linear algebra", "Corvinus Library"),
        ("Machine Learning Practice", "Hands-on ML problems", "CEU Library"),
        ("Exam Prep", "Prepare for university exams", "ELTE Campus"),
        ("Deep Work Sprint", "2-hour deep work block", "Pázmány Library"),
        ("Weekend Study Jam", "Casual weekend study session", "Óbuda University"),
    ]

    for i, (title, desc, loc) in enumerate(sample_events):
        cover_url = COVER_IMAGES[i % len(COVER_IMAGES)]

        start = now + timedelta(days=rng.randint(1, 7), hours=17)
        ev = Event(
            title=title,
            description=desc,
            location=loc,
            starts_at=start,       
            capacity=20,
            duration=2,
            exam=None,
            created_by=admin.id,
            cover_image_url=cover_url,
        )
        session.add(ev)

    session.commit()

    print("Seeded admin")
    print("Created sample events with cover images")
