"""Database migration utilities"""
from sqlalchemy import text
from app.db import engine

def migrate_add_group_id_to_events():
    """Add group_id column to event table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(event)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'group_id' not in columns:
                print("Adding group_id column to event table...")
                conn.execute(text("ALTER TABLE event ADD COLUMN group_id INTEGER"))
                conn.commit()
                print("✓ Added group_id column to event table")
            else:
                print("✓ group_id column already exists in event table")
    except Exception as e:
        print(f"Migration note: {e}")

def migrate_add_xp_to_users():
    """Add xp column to user table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='user'"))
            if not result.fetchone():
                print("User table doesn't exist yet, will be created by init_db")
                return
            
            result = conn.execute(text("PRAGMA table_info(user)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'xp' not in columns:
                print("Adding xp column to user table...")
                conn.execute(text("ALTER TABLE user ADD COLUMN xp INTEGER DEFAULT 0"))
                conn.commit()
                print("✓ Added xp column to user table")
            else:
                print("✓ xp column already exists in user table")
    except Exception as e:
        print(f"Migration note (xp): {e}")

def migrate_add_study_materials_to_events():
    """Add study_materials column to event table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(event)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'study_materials' not in columns:
                print("Adding study_materials column to event table...")
                conn.execute(text("ALTER TABLE event ADD COLUMN study_materials TEXT"))
                conn.commit()
                print("✓ Added study_materials column to event table")
            else:
                print("✓ study_materials column already exists in event table")
    except Exception as e:
        print(f"Migration note: {e}")

def migrate_add_event_messages():
    """Add event_message table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='eventmessage'"))
            if not result.fetchone():
                print("Creating event_message table...")
                # Table will be created by SQLModel if it doesn't exist
                from app.models import EventMessage
                from sqlmodel import SQLModel
                SQLModel.metadata.create_all(engine)
                print("✓ Event message table created")
            else:
                print("✓ Event message table already exists")
    except Exception as e:
        print(f"Migration note (event_messages): {e}")

def migrate_add_group_messages():
    """Add group_message table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='groupmessage'"))
            if not result.fetchone():
                print("Creating group_message table...")
                # Table will be created by SQLModel if it doesn't exist
                from app.models import GroupMessage
                from sqlmodel import SQLModel
                SQLModel.metadata.create_all(engine)
                print("✓ Group message table created")
            else:
                print("✓ Group message table already exists")
    except Exception as e:
        print(f"Migration note (group_messages): {e}")

def migrate_add_is_deleted_to_event_messages():
    """Add is_deleted column to eventmessage table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='eventmessage'"))
            if not result.fetchone():
                print("Event message table doesn't exist yet, will be created by init_db")
                return
            
            result = conn.execute(text("PRAGMA table_info(eventmessage)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'is_deleted' not in columns:
                print("Adding is_deleted column to eventmessage table...")
                conn.execute(text("ALTER TABLE eventmessage ADD COLUMN is_deleted INTEGER DEFAULT 0"))
                conn.commit()
                print("✓ Added is_deleted column to eventmessage table")
            else:
                print("✓ is_deleted column already exists in eventmessage table")
    except Exception as e:
        print(f"Migration note (is_deleted): {e}")

def migrate_add_is_deleted_to_group_messages():
    """Add is_deleted column to groupmessage table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='groupmessage'"))
            if not result.fetchone():
                print("Group message table doesn't exist yet, will be created by init_db")
                return
            
            result = conn.execute(text("PRAGMA table_info(groupmessage)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'is_deleted' not in columns:
                print("Adding is_deleted column to groupmessage table...")
                conn.execute(text("ALTER TABLE groupmessage ADD COLUMN is_deleted INTEGER DEFAULT 0"))
                conn.commit()
                print("✓ Added is_deleted column to groupmessage table")
            else:
                print("✓ is_deleted column already exists in groupmessage table")
    except Exception as e:
        print(f"Migration note (is_deleted group): {e}")

def migrate_add_mission_description_to_groups():
    """Add mission_description column to group table if it doesn't exist"""
    try:
        with engine.begin() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='group'"))
            if not result.fetchone():
                print("Group table doesn't exist yet, will be created by init_db")
                return
            
            result = conn.execute(text("PRAGMA table_info(\"group\")"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'mission_description' not in columns:
                print("Adding mission_description column to group table...")
                conn.execute(text("ALTER TABLE \"group\" ADD COLUMN mission_description TEXT"))
                print("✓ Added mission_description column to group table")
            else:
                print("✓ mission_description column already exists in group table")
    except Exception as e:
        print(f"Migration error (mission_description): {e}")
        import traceback
        traceback.print_exc()

def migrate_add_message_reads():
    """Add messageread table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='messageread'"))
            if not result.fetchone():
                print("Creating messageread table...")
                # Table will be created by SQLModel if it doesn't exist
                from app.models import MessageRead
                from sqlmodel import SQLModel
                SQLModel.metadata.create_all(engine)
                print("✓ Message read table created")
            else:
                print("✓ Message read table already exists")
    except Exception as e:
        print(f"Migration note (message_reads): {e}")

def migrate_add_message_reactions():
    """Add messagereaction table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='messagereaction'"))
            if not result.fetchone():
                print("Creating messagereaction table...")
                # Table will be created by SQLModel if it doesn't exist
                from app.models import MessageReaction
                from sqlmodel import SQLModel
                SQLModel.metadata.create_all(engine)
                print("✓ Message reaction table created")
            else:
                print("✓ Message reaction table already exists")
    except Exception as e:
        print(f"Migration note (message_reactions): {e}")

def run_migrations():
    """Run all pending migrations"""
    migrate_add_group_id_to_events()
    migrate_add_xp_to_users()
    migrate_add_study_materials_to_events()
    migrate_add_event_messages()
    migrate_add_group_messages()
    migrate_add_is_deleted_to_event_messages()
    migrate_add_is_deleted_to_group_messages()
    migrate_add_message_reads()
    migrate_add_message_reactions()

