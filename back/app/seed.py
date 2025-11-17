"""
Database Seeder
Creates admin user and seeds groups and events for development/testing.
"""
from datetime import datetime, timedelta
import random
import secrets
import string
from sqlmodel import Session, select, func
from app.core.security import hash_password
from app.models import User, Group, GroupMember, Event, EventKind
from app.config import settings

MAX_XP = 999999  


def _slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    base = ''.join(c.lower() if (c.isalnum() or c == ' ') else '' for c in text)
    return '-'.join([p for p in base.split(' ') if p])


def _rand_suffix(n: int = 5) -> str:
    """Generate random alphanumeric suffix."""
    return ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(n))


COVER_IMAGES = [
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=200&fit=crop&q=80",  # Study/Books
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop&q=80",  # Team/Group
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=200&fit=crop&q=80",  # Education
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=200&fit=crop&q=80",  # Learning
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop&q=80",  # Coding/Programming
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop&q=80",  # Data/Analytics
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=200&fit=crop&q=80",  # Technology
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop&q=80",  # Science
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=200&fit=crop&q=80",  # Business
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=200&fit=crop&q=80",  # Exam/Test
    "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=400&h=200&fit=crop&q=80",  # Cloud/Server
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop&q=80",  # Research
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=200&fit=crop&q=80",  # Collaboration
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop&q=80",  # Workshop
    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop&q=80",  # Online Learning
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=200&fit=crop&q=80",  # Library
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=200&fit=crop&q=80",  # Study Group
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop&q=80",  # Development
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop&q=80",  # Innovation
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=200&fit=crop&q=80",  # Digital
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop&q=80",  # Analytics
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=200&fit=crop&q=80",  # Knowledge
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop&q=80",  # Community
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=200&fit=crop&q=80",  # Growth
    "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=400&h=200&fit=crop&q=80",  # Success
]


def _ensure_admin_user(session: Session) -> User:
    """Ensure admin user exists with maximum XP."""
    admin = session.exec(
        select(User).where(User.email == settings.ADMIN_EMAIL)
    ).first()
    
    if admin:
        # Update admin to ensure maximum XP
        admin.xp = MAX_XP
        session.add(admin)
        session.commit()
        session.refresh(admin)
        return admin
    
    admin = User(
        email=settings.ADMIN_EMAIL,
        hashed_password=hash_password(settings.ADMIN_PASSWORD),
        name="Harry Shady",
        is_verified=True,
        xp=MAX_XP
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)
    return admin


LOCATIONS = [
    ("Eötvös Loránd University", "Budapest, Hungary"),
    ("Budapest University of Technology", "Budapest, Hungary"),
    ("Corvinus University", "Budapest, Hungary"),
    ("Central European University", "Budapest, Hungary"),
    ("Semmelweis University", "Budapest, Hungary"),
    ("University of Debrecen", "Debrecen, Hungary"),
    ("University of Szeged", "Szeged, Hungary"),
    ("University of Pécs", "Pécs, Hungary"),
    ("Óbuda University", "Budapest, Hungary"),
    ("Széchenyi István University", "Győr, Hungary"),
    ("University of Miskolc", "Miskolc, Hungary"),
    ("Pázmány Péter Catholic University", "Budapest, Hungary"),
    ("Károli Gáspár University", "Budapest, Hungary"),
    ("University of Pannonia", "Veszprém, Hungary"),
    ("Szent István University", "Gödöllő, Hungary"),
    ("University of Sopron", "Sopron, Hungary"),
    ("Budapest Metropolitan University", "Budapest, Hungary"),
    ("BME Library", "Budapest, Hungary"),
    ("ELTE Library", "Budapest, Hungary"),
    ("Corvinus Library", "Budapest, Hungary"),
    ("National Library", "Budapest, Hungary"),
    ("Debrecen City Library", "Debrecen, Hungary"),
    ("Szeged City Library", "Szeged, Hungary"),
    ("Pécs City Library", "Pécs, Hungary"),
    ("Győr City Library", "Győr, Hungary"),
]

GROUP_TEMPLATES = [
    ("GRE Prep Study Group", "Complete GRE preparation with peer accountability and practice tests", "Graduate School", "GRE"),
    ("GMAT Study Circle", "GMAT preparation with practice tests and strategy sessions", "Business School", "GMAT"),
    ("LSAT Prep Team", "LSAT preparation with mock exams and logic games practice", "Law School", "LSAT"),
    ("MCAT Study Squad", "Intensive MCAT preparation with study partners and content review", "Medical School", "MCAT"),
    ("DAT Prep Group", "Dental Admission Test preparation with practice questions", "Dental School", "DAT"),
    ("PCAT Study Circle", "Pharmacy College Admission Test preparation group", "Pharmacy School", "PCAT"),
    
    ("CPA Study Group", "CPA exam preparation with weekly check-ins and practice questions", "Accounting", "CPA"),
    ("CFA Level 1 Study", "CFA Level 1 exam preparation with study materials and mock exams", "Finance", "CFA Level 1"),
    ("CFA Level 2 Study", "CFA Level 2 exam preparation focused on portfolio management", "Finance", "CFA Level 2"),
    ("CFA Level 3 Study", "CFA Level 3 exam preparation for portfolio management and wealth planning", "Finance", "CFA Level 3"),
    ("PMP Certification Prep", "Project Management Professional certification study group", "Project Management", "PMP"),
    ("AWS Solutions Architect", "AWS Solutions Architect certification prep and hands-on labs", "Cloud Computing", "AWS SAA"),
    ("AWS Developer Associate", "AWS Developer Associate certification preparation", "Cloud Computing", "AWS DVA"),
    ("Google Cloud Professional", "GCP Professional Cloud Architect certification study", "Cloud Computing", "GCP PCA"),
    ("Azure Fundamentals", "Microsoft Azure Fundamentals certification preparation", "Cloud Computing", "AZ-900"),
    ("Azure Administrator", "Microsoft Azure Administrator certification prep", "Cloud Computing", "AZ-104"),
    ("Kubernetes Administrator", "CKA certification preparation with hands-on practice", "DevOps", "CKA"),
    ("Docker Certified Associate", "Docker certification preparation and containerization practice", "DevOps", "DCA"),
    
    ("Python for Beginners", "Learn Python programming from scratch with hands-on projects", "Programming", "Python Basics"),
    ("Advanced Python", "Master advanced Python concepts: decorators, generators, async/await", "Programming", "Advanced Python"),
    ("JavaScript Fundamentals", "Master JavaScript basics, ES6+, and modern web development", "Web Development", "JavaScript"),
    ("TypeScript Mastery", "Learn TypeScript for scalable frontend and backend development", "Web Development", "TypeScript"),
    ("React Learning Group", "Learn React.js step by step with component building and hooks", "Frontend Development", "React"),
    ("Vue.js Study Group", "Master Vue.js framework with composition API and state management", "Frontend Development", "Vue.js"),
    ("Angular Development", "Build enterprise applications with Angular framework", "Frontend Development", "Angular"),
    ("Node.js Backend Development", "Build scalable backend applications with Node.js and Express", "Backend Development", "Node.js"),
    ("Django Web Development", "Build web applications with Django framework and Python", "Backend Development", "Django"),
    ("Flask Development", "Create REST APIs and web apps with Flask microframework", "Backend Development", "Flask"),
    ("Full Stack Web Development", "Complete web development from frontend to backend", "Web Development", "Full Stack"),
    ("Mobile App Development", "Build iOS and Android apps with React Native and Flutter", "Mobile Development", "React Native/Flutter"),
    ("iOS Development with Swift", "Learn iOS app development with Swift and SwiftUI", "Mobile Development", "iOS/Swift"),
    ("Android Development", "Build Android apps with Kotlin and Jetpack Compose", "Mobile Development", "Android/Kotlin"),
    
    ("Data Science Intro", "Introduction to data science concepts, pandas, and visualization", "Data Science", "Python & Statistics"),
    ("Advanced Data Science", "Advanced data science: feature engineering, model selection, deployment", "Data Science", "Advanced Data Science"),
    ("Machine Learning Basics", "Learn ML fundamentals with scikit-learn and TensorFlow", "Machine Learning", "Python & ML"),
    ("Deep Learning Study Group", "Advanced deep learning with neural networks and CNNs", "Machine Learning", "Deep Learning"),
    ("NLP Specialization", "Natural Language Processing with transformers and embeddings", "Machine Learning", "NLP"),
    ("Computer Vision", "Image recognition, object detection, and computer vision applications", "Machine Learning", "Computer Vision"),
    ("Data Engineering Bootcamp", "ETL pipelines, data warehousing, and big data tools", "Data Engineering", "Apache Spark"),
    ("Big Data Analytics", "Work with Hadoop, Spark, and distributed computing systems", "Data Engineering", "Big Data"),
    
    ("Coding Interview Prep", "Prepare for technical interviews with LeetCode and system design", "Computer Science", "Technical Interviews"),
    ("System Design Mastery", "Master system design concepts for senior engineering roles", "Computer Science", "System Design"),
    ("Algorithm Problem Solving", "Solve algorithm problems together with peer review", "Computer Science", "Algorithms & Data Structures"),
    ("Data Structures Deep Dive", "Master advanced data structures: tries, segment trees, heaps", "Computer Science", "Algorithms & Data Structures"),
    ("Competitive Programming", "Prepare for coding competitions and contests", "Computer Science", "Competitive Programming"),
    
    ("Bar Exam Study Group", "Bar exam preparation with mock tests and essay practice", "Law School", "Bar Exam"),
    ("USMLE Step 1 Prep", "USMLE Step 1 preparation with question banks and study schedules", "Medical School", "USMLE Step 1"),
    ("USMLE Step 2 Prep", "USMLE Step 2 CK preparation with clinical knowledge review", "Medical School", "USMLE Step 2"),
    ("NCLEX-RN Study Group", "NCLEX-RN exam preparation for nursing students", "Nursing", "NCLEX-RN"),
    ("TOEFL Preparation", "TOEFL iBT preparation with speaking and writing practice", "Language Learning", "TOEFL"),
    ("IELTS Study Circle", "IELTS preparation with all four skills: reading, writing, listening, speaking", "Language Learning", "IELTS"),
    ("SAT Prep Group", "SAT preparation for high school students", "High School", "SAT"),
    ("ACT Study Circle", "ACT test preparation with practice tests and strategies", "High School", "ACT"),
]

EVENT_TEMPLATES = [
    ("Python Coding Practice", "Practice Python algorithms and data structures with peer review", "Python Basics"),
    ("Advanced Python Workshop", "Deep dive into Python decorators, generators, and async programming", "Advanced Python"),
    ("JavaScript Study Session", "Study JavaScript fundamentals, closures, and async programming", "JavaScript"),
    ("TypeScript Fundamentals", "Learn TypeScript types, interfaces, and advanced features", "TypeScript"),
    ("React Component Building", "Build React components together with hooks and state management", "React"),
    ("React Performance Optimization", "Optimize React apps with memoization, code splitting, and lazy loading", "React"),
    ("Vue.js Workshop", "Build Vue.js applications with Composition API and Pinia", "Vue.js"),
    ("Angular Development Session", "Create Angular components, services, and modules", "Angular"),
    ("Node.js Backend Workshop", "Create REST APIs and backend services with Node.js", "Node.js"),
    ("Django REST Framework", "Build RESTful APIs with Django REST Framework", "Django"),
    ("Flask API Development", "Create REST APIs with Flask and SQLAlchemy", "Flask"),
    ("Full Stack Project Day", "Build a complete full stack application from scratch", "Full Stack"),
    ("SQL Query Workshop", "Practice SQL queries, joins, and database design", None),
    ("Database Design Session", "Design database schemas and optimize queries", None),
    ("System Design Discussion", "Discuss system design concepts and architecture patterns", "System Design"),
    ("Microservices Architecture", "Design and implement microservices with best practices", "System Design"),
    ("Mock Technical Interview", "Practice coding interviews with real interview questions", "Technical Interviews"),
    ("Data Structures Review", "Review and practice data structures: trees, graphs, heaps", "Algorithms & Data Structures"),
    ("Algorithm Problem Solving", "Solve algorithm problems together using LeetCode", "Algorithms & Data Structures"),
    ("Dynamic Programming Workshop", "Master dynamic programming patterns and techniques", "Algorithms & Data Structures"),
    ("Graph Algorithms Practice", "Practice graph traversal, shortest paths, and network flow", "Algorithms & Data Structures"),
    ("Frontend Development Workshop", "Build responsive frontend projects with modern frameworks", "Frontend Development"),
    ("Backend API Development", "Create REST APIs with authentication and validation", "Backend Development"),
    ("Mobile App Development", "Build mobile apps with React Native and Flutter", "React Native/Flutter"),
    ("iOS Development Session", "Build iOS apps with Swift and SwiftUI", "iOS/Swift"),
    ("Android Development Workshop", "Create Android apps with Kotlin and Jetpack Compose", "Android/Kotlin"),
    ("Git and Version Control", "Learn Git workflow, branching strategies, and collaboration", None),
    ("CI/CD Pipeline Setup", "Set up continuous integration and deployment pipelines", None),
    
    # Data Science & AI
    ("Machine Learning Study Session", "Study ML concepts, model training, and evaluation", "Python & ML"),
    ("Deep Learning Workshop", "Build neural networks and CNNs with TensorFlow/PyTorch", "Deep Learning"),
    ("Data Science Practice", "Practice data analysis, visualization, and statistical modeling", "Python & Statistics"),
    ("Advanced Data Science Workshop", "Feature engineering, model selection, and hyperparameter tuning", "Advanced Data Science"),
    ("Data Engineering Bootcamp", "Build ETL pipelines and work with big data tools", "Apache Spark"),
    ("Big Data Processing", "Process large datasets with Spark, Hadoop, and distributed systems", "Big Data"),
    ("NLP Study Group", "Natural Language Processing with transformers and embeddings", "NLP"),
    ("Computer Vision Workshop", "Image recognition, object detection, and CV applications", "Computer Vision"),
    ("Time Series Analysis", "Analyze time series data with ARIMA, LSTM, and forecasting", "Data Science"),
    ("Data Visualization Mastery", "Create compelling visualizations with matplotlib, seaborn, and plotly", "Data Science"),
    
    # Cloud & DevOps
    ("AWS Hands-On Lab", "Deploy applications on AWS with EC2, S3, and Lambda", "AWS SAA"),
    ("AWS Advanced Services", "Work with AWS advanced services: ECS, EKS, RDS, and DynamoDB", "AWS SAA"),
    ("Google Cloud Platform Workshop", "Deploy applications on GCP with Compute Engine and Cloud Functions", "GCP PCA"),
    ("Azure Deployment Lab", "Deploy applications on Azure with App Service and Functions", "AZ-104"),
    ("Cloud Computing Workshop", "Learn cloud platforms: AWS, GCP, and Azure", "Cloud Computing"),
    ("DevOps Practice Session", "Practice deployment, CI/CD pipelines, and containerization", None),
    ("Docker & Kubernetes Workshop", "Container orchestration and microservices deployment", None),
    ("Kubernetes Deep Dive", "Master Kubernetes concepts: pods, services, deployments, and ingress", "CKA"),
    ("Infrastructure as Code", "Manage infrastructure with Terraform and CloudFormation", None),
    ("Monitoring & Logging", "Set up monitoring, logging, and alerting for applications", None),
    
    # Exam Prep
    ("GRE Practice Test Session", "Take timed GRE practice tests and review answers", "GRE"),
    ("GRE Verbal Reasoning", "Practice GRE verbal reasoning questions and strategies", "GRE"),
    ("GRE Quantitative Reasoning", "Solve GRE quantitative problems and review solutions", "GRE"),
    ("GMAT Problem Solving", "Solve GMAT quantitative and verbal problems together", "GMAT"),
    ("GMAT Integrated Reasoning", "Practice GMAT integrated reasoning and data sufficiency", "GMAT"),
    ("LSAT Logic Games Practice", "Practice LSAT logic games and analytical reasoning", "LSAT"),
    ("LSAT Reading Comprehension", "Master LSAT reading comprehension strategies", "LSAT"),
    ("MCAT Content Review", "Review MCAT biology, chemistry, physics, and psychology", "MCAT"),
    ("MCAT Practice Questions", "Solve MCAT practice questions and review explanations", "MCAT"),
    ("CPA Exam Practice", "Practice CPA exam questions and simulations", "CPA"),
    ("CFA Level 1 Mock Exam", "Take CFA Level 1 mock exam and review results", "CFA Level 1"),
    ("CFA Level 2 Practice", "Practice CFA Level 2 exam questions and case studies", "CFA Level 2"),
    ("PMP Exam Prep Session", "Review PMP exam content and practice questions", "PMP"),
    ("AWS Certification Practice", "Take AWS practice exams and review key concepts", "AWS SAA"),
    ("Bar Exam Essay Practice", "Practice bar exam essay writing and IRAC format", "Bar Exam"),
    ("USMLE Step 1 Q-Bank Review", "Review USMLE Step 1 question banks and explanations", "USMLE Step 1"),
    ("NCLEX Practice Questions", "Practice NCLEX-RN questions and review nursing concepts", "NCLEX-RN"),
    ("TOEFL Speaking Practice", "Practice TOEFL speaking tasks with peer feedback", "TOEFL"),
    ("IELTS Writing Workshop", "Practice IELTS writing tasks with peer review", "IELTS"),
    ("SAT Math Practice", "Solve SAT math problems and review strategies", "SAT"),
    ("ACT Science Reasoning", "Practice ACT science reasoning passages and questions", "ACT"),
    
    # Other
    ("Web Security Discussion", "Discuss web security best practices and vulnerabilities", None),
    ("Code Review Session", "Peer code review and best practices discussion", None),
    ("Tech Career Panel", "Discuss tech career paths, resumes, and networking", None),
    ("Study Group Meetup", "General study group meetup for accountability and motivation", None),
    ("Open Source Contribution", "Contribute to open source projects together", None),
    ("Portfolio Building Workshop", "Build and showcase your portfolio projects", None),
    ("Resume Review Session", "Review and improve resumes with peer feedback", None),
    ("Mock System Design Interview", "Practice system design interviews with real scenarios", "System Design"),
    ("Competitive Programming Contest", "Participate in coding contests and solve problems together", "Competitive Programming"),
]


def seed_db(session: Session) -> None:
    """
    Idempotent seeding of groups and events.
    
    - Ensures admin user exists with maximum XP
    - Creates diverse groups and events if database is empty
    - All seeded content is owned by admin
    """
    # Ensure admin exists
    admin = _ensure_admin_user(session)
    
    # Check if seeding is needed
    group_count = session.exec(select(func.count()).select_from(Group)).one()
    event_count = session.exec(select(func.count()).select_from(Event)).one()
    
    if group_count > 0 or event_count > 0:
        print("✓ Seed skipped: groups/events already present")
        return
    
    # Seed groups
    now = datetime.utcnow()
    rng = random.Random(42)  # Fixed seed for reproducibility
    
    groups = []
    groups_to_create = 25
    
    for i in range(groups_to_create):
        name, description, field, exam = GROUP_TEMPLATES[i % len(GROUP_TEMPLATES)]
        group_days = rng.randint(30, 120)
        deadline = now + timedelta(days=group_days)
        capacity = rng.randint(4, 12)
        group_id = f"{_slugify(name)}-{_rand_suffix(6)}"
        cover_image_url = COVER_IMAGES[i % len(COVER_IMAGES)]
        
        group = Group(
            id=group_id,
            name=name,
            field=field,
            exam=exam,
            description=f"{description}. Join our accountability group and achieve your goal together!",
            created_by=admin.id,
            members=0,
            deadline=deadline,
            capacity=capacity,
            cover_image_url=cover_image_url,
        )
        groups.append(group)
        session.add(group)
    
    session.commit()
    
    # Add admin as leader to all groups
    for group in groups:
        session.add(GroupMember(group_id=group.id, user_id=admin.id, is_leader=True))
        group.members = 1
        session.add(group)
    
    session.commit()
    
    # Seed events
    events = []
    events_to_create = 25
    
    for i in range(events_to_create):
        title, description, exam = EVENT_TEMPLATES[i % len(EVENT_TEMPLATES)]
        start = now + timedelta(
            days=rng.randint(1, 60),
            hours=rng.randint(9, 20),
            minutes=rng.choice([0, 30])
        )
        location_name, location_full = LOCATIONS[i % len(LOCATIONS)]
        capacity = rng.randint(3, 10)
        cover_image_url = COVER_IMAGES[i % len(COVER_IMAGES)]
        
        event = Event(
            title=title,
            starts_at=start,
            location=location_full,
            capacity=capacity,
            description=f"{description}. Join us for hands-on practice and peer learning!",
            exam=exam,
            group_id=None,
            kind=EventKind.one_off,
            created_by=admin.id,
            cover_image_url=cover_image_url,
        )
        events.append(event)
        session.add(event)
    
    session.commit()
    
    # Backfill creator attendees for events that don't have them
    from app.models import EventAttendee
    added = 0
    for event in events:
        exists = session.exec(
            select(EventAttendee)
            .where(EventAttendee.event_id == event.id, EventAttendee.user_id == event.created_by)
        ).first()
        if not exists:
            session.add(EventAttendee(event_id=event.id, user_id=event.created_by))
            added += 1
    if added > 0:
        session.commit()
        print(f"✓ Backfilled {added} missing creator attendees")
    
    print(f"✓ Seeded admin {admin.email}")
    print(f"✓ Created {len(groups)} groups")
    print(f"✓ Created {len(events)} events")
    print("✓ Database seeding completed")
