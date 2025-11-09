"""Database migration utilities"""
from sqlalchemy import text
from app.db import engine

def migrate_add_group_id_to_events():
    """Add group_id column to event table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            # Check if column exists using SQLite pragma
            result = conn.execute(text("PRAGMA table_info(event)"))
            columns = [row[1] for row in result.fetchall()]  # Column name is at index 1
            
            if 'group_id' not in columns:
                print("Adding group_id column to event table...")
                conn.execute(text("ALTER TABLE event ADD COLUMN group_id INTEGER"))
                conn.commit()
                print("✓ Added group_id column to event table")
            else:
                print("✓ group_id column already exists in event table")
    except Exception as e:
        # Table might not exist yet, that's okay - init_db will create it
        print(f"Migration note: {e}")

def run_migrations():
    """Run all pending migrations"""
    migrate_add_group_id_to_events()

