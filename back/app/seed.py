from datetime import datetime, timedelta
import random
import secrets
import string
from sqlmodel import Session, select, func
from app.core.security import hash_password
from app.models import (
    User,
    Group,
    GroupMember,
    Event,
    EventKind,
)
from app.config import settings


def _slugify(text: str) -> str:
    base = ''.join(c.lower() if (c.isalnum() or c == ' ') else '' for c in text)
    return '-'.join([p for p in base.split(' ') if p])


def _rand_suffix(n: int = 5) -> str:
    return ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(n))


def seed_db(session: Session) -> None:
    """Idempotent seeding of mission-style groups and events.

    - Ensure admin user exists (harryshady131@gmail.com)
    - If groups/events are empty, generate hundreds of mission groups and events
      owned by the admin so only they can update/delete them via created_by checks.
    """

    # Ensure admin exists
    admin_email = settings.ADMIN_EMAIL
    admin_password = settings.ADMIN_PASSWORD or "password123"
    admin = session.exec(select(User).where(User.email == admin_email)).first()
    if not admin:
        admin = User(
            email=admin_email,
            hashed_password=hash_password(admin_password),
            is_verified=True,
            name="Harry",
            bio="Mission-driven learner",
        )
        session.add(admin)
        session.commit()
        session.refresh(admin)
    else:
        # Enforce admin verification and update password from config each startup
        admin.is_verified = True
        admin.hashed_password = hash_password(admin_password)
        session.add(admin)
        session.commit()
        session.refresh(admin)

    # Ensure a few demo users (non-admin)
    demo_users = [
        ("alice@example.com", "Alice Johnson", "Computer Science student passionate about AI and machine learning"),
        ("bob@example.com", "Bob Smith", "Engineering student focused on software development"),
        ("carol@example.com", "Carol Davis", "Data science enthusiast and Python developer")
    ]
    
    for em, name, bio in demo_users:
        exists = session.exec(select(User).where(User.email == em)).first()
        if not exists:
            u = User(
                email=em, 
                hashed_password=hash_password("password123"), 
                is_verified=True,
                name=name,
                bio=bio,
                photo_url=f"https://api.dicebear.com/9.x/avataaars/svg?seed={em}"
            )
            session.add(u)
        else:
            # Update existing users with better data
            exists.name = name
            exists.bio = bio
            exists.photo_url = f"https://api.dicebear.com/9.x/avataaars/svg?seed={em}"
            session.add(exists)
    session.commit()

    # Only generate bulk data if empty (avoid duplicating on restarts)
    group_count = session.exec(select(func.count()).select_from(Group)).one()
    event_count = session.exec(select(func.count()).select_from(Event)).one()
    if group_count > 0 or event_count > 0:
        print("Seed skipped: groups/events already present")
        return

    # Real locations with coordinates for future map integration
    real_locations = [
        ("New York University", "New York, NY", "40.7295", "-73.9965"),
        ("Columbia University", "New York, NY", "40.8075", "-73.9626"),
        ("MIT", "Cambridge, MA", "42.3601", "-71.0942"),
        ("Harvard University", "Cambridge, MA", "42.3770", "-71.1167"),
        ("Stanford University", "Stanford, CA", "37.4275", "-122.1697"),
        ("UC Berkeley", "Berkeley, CA", "37.8719", "-122.2585"),
        ("UCLA", "Los Angeles, CA", "34.0689", "-118.4452"),
        ("University of Chicago", "Chicago, IL", "41.7886", "-87.5987"),
        ("Northwestern University", "Evanston, IL", "42.0565", "-87.6753"),
        ("University of Michigan", "Ann Arbor, MI", "42.2808", "-83.7430"),
        ("Carnegie Mellon University", "Pittsburgh, PA", "40.4426", "-79.9442"),
        ("University of Pennsylvania", "Philadelphia, PA", "39.9522", "-75.1932"),
        ("Duke University", "Durham, NC", "36.0016", "-78.9382"),
        ("UNC Chapel Hill", "Chapel Hill, NC", "35.9049", "-79.0469"),
        ("Georgia Tech", "Atlanta, GA", "33.7756", "-84.3963"),
        ("University of Texas Austin", "Austin, TX", "30.2849", "-97.7341"),
        ("Rice University", "Houston, TX", "29.7174", "-95.4018"),
        ("University of Washington", "Seattle, WA", "47.6553", "-122.3035"),
        ("University of British Columbia", "Vancouver, BC", "49.2606", "-123.2460"),
        ("McGill University", "Montreal, QC", "45.5048", "-73.5772"),
    ]

    # Group mission templates - focused on long-term goals with deadlines
    group_templates = [
        ("GRE Prep Study Group", "Complete GRE preparation with peer accountability", "GRE Master", "Graduate School", "GRE"),
        ("MCAT Study Squad", "Intensive MCAT preparation with study partners", "MCAT Ace", "Medical School", "MCAT"),
        ("Bar Exam Study Group", "Bar exam preparation with mock tests", "Bar Exam Pro", "Law School", "Bar Exam"),
        ("CPA Study Group", "CPA exam preparation with weekly check-ins", "CPA Champion", "Accounting", "CPA"),
        ("Coding Interview Prep", "Prepare for technical interviews together", "Tech Interview Pro", "Computer Science", "Technical Interviews"),
        ("GMAT Study Circle", "GMAT preparation with practice tests", "GMAT Expert", "Business School", "GMAT"),
        ("LSAT Prep Team", "LSAT preparation with mock exams", "LSAT Master", "Law School", "LSAT"),
        ("CFA Level 1 Study", "CFA Level 1 exam preparation", "CFA Candidate", "Finance", "CFA Level 1"),
        ("PMP Certification Prep", "Project Management Professional certification", "PMP Certified", "Project Management", "PMP"),
        ("AWS Certification Study", "AWS Solutions Architect certification prep", "AWS Expert", "Cloud Computing", "AWS SAA"),
        ("Python for Beginners", "Learn Python programming from scratch", "Python Beginner", "Programming", "Python Basics"),
        ("JavaScript Fundamentals", "Master JavaScript basics and ES6", "JS Beginner", "Web Development", "JavaScript"),
        ("React Learning Group", "Learn React.js step by step", "React Beginner", "Frontend Development", "React"),
        ("Data Science Intro", "Introduction to data science concepts", "Data Science Beginner", "Data Science", "Python & Statistics"),
        ("Machine Learning Basics", "Learn ML fundamentals", "ML Beginner", "Machine Learning", "Python & ML"),
    ]

    # Event practice session templates - casual one-time meetings
    event_practice_templates = [
        ("Python Coding Practice", "Practice Python algorithms and data structures"),
        ("SQL Query Workshop", "Practice SQL queries and database design"),
        ("React Component Building", "Build React components together"),
        ("System Design Discussion", "Discuss system design concepts"),
        ("Mock Technical Interview", "Practice coding interviews"),
        ("Data Structures Review", "Review and practice data structures"),
        ("Algorithm Problem Solving", "Solve algorithm problems together"),
        ("Database Design Session", "Design database schemas"),
        ("Frontend Development", "Build frontend projects"),
        ("Backend API Development", "Create REST APIs"),
        ("Machine Learning Study", "Study ML concepts and implementations"),
        ("DevOps Practice", "Practice deployment and CI/CD"),
        ("Mobile App Development", "Build mobile apps"),
        ("Web Security Discussion", "Discuss web security best practices"),
        ("Cloud Computing Workshop", "Learn cloud platforms"),
        ("Python for Beginners", "Learn Python basics together"),
        ("JavaScript Study Session", "Study JavaScript fundamentals"),
        ("React Workshop", "Hands-on React development"),
        ("Data Science Practice", "Practice data analysis and visualization"),
        ("Git and Version Control", "Learn Git workflow and collaboration"),
    ]

    now = datetime.utcnow()
    rng = random.Random(42)

    groups_to_create = 50  # Fewer groups for better quality
    events_to_create = 80  # Fewer events for better quality

    groups = []
    for i in range(groups_to_create):
        base_title, base_desc, badge, field, exam = group_templates[i % len(group_templates)]
        group_days = rng.randint(30, 120)  # 1-4 months for exam prep
        deadline = now + timedelta(days=group_days)
        cap = rng.randint(4, 12)  # Much smaller groups for better accountability
        name = base_title  # Remove cohort numbering
        gid = f"{_slugify(base_title)}-{_rand_suffix(6)}"
        g = Group(
            id=gid,
            name=name,
            field=field,
            exam=exam,
            description=f"{base_desc}. Join our accountability group and achieve your goal together!",
            created_by=admin.id,
            members=0,
            deadline=deadline,
            capacity=cap,
        )
        groups.append(g)
        session.add(g)
    session.commit()

    # Add admin as leader/member of each group and set members=1
    for g in groups:
        session.add(GroupMember(group_id=g.id, user_id=admin.id, is_leader=True))
        g.members = 1
        session.add(g)
    session.commit()

    # Events: casual practice sessions for exam prep and skill building
    events = []
    for i in range(events_to_create):
        topic, description = event_practice_templates[i % len(event_practice_templates)]
        start = now + timedelta(days=rng.randint(1, 30), hours=rng.randint(9, 20))  # Next 30 days
        title = topic  # Remove session numbering
        location_name, location_full, lat, lng = real_locations[i % len(real_locations)]
        capacity = rng.randint(3, 8)  # Much smaller groups for effective practice
        evt = Event(
            title=title,
            starts_at=start,
            location=location_full,
            capacity=capacity,
            description=f"{description}. Join us for hands-on practice and peer learning!",
            group_id=None,
            kind=EventKind.one_off,  # All events are one-time practice sessions
            created_by=admin.id,
        )
        events.append(evt)
        session.add(evt)
    session.commit()

    print(f"Seeded admin {admin.email}, {len(groups)} mission groups, and {len(events)} events")
