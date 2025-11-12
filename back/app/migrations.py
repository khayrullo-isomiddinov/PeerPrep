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

def run_migrations():
    """Run all pending migrations"""
    migrate_add_group_id_to_events()
    migrate_add_xp_to_users()

