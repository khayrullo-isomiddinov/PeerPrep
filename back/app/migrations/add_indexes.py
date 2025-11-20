"""
Database migration to add performance indexes (EVENT-ONLY VERSION)
"""
from sqlmodel import SQLModel, create_engine, text
from app.config import settings

def add_performance_indexes():
    """Add indexes for frequently queried fields – events only."""
    connect_args = (
        {"check_same_thread": False}
        if settings.DATABASE_URL.startswith("sqlite")
        else {}
    )

    engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

    indexes = [
        # --- EVENT TABLE INDEXES ---
        "CREATE INDEX IF NOT EXISTS idx_event_created_at ON event(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_event_starts_at ON event(starts_at ASC)",
        "CREATE INDEX IF NOT EXISTS idx_event_created_by ON event(created_by)",

        # --- EVENT ATTENDEE ---
        "CREATE INDEX IF NOT EXISTS idx_eventattendee_user_event ON eventattendee(user_id, event_id)"
    ]

    with engine.connect() as conn:
        for index_sql in indexes:
            try:
                conn.execute(text(index_sql))
                conn.commit()
                print(f"✓ Created index: {index_sql[:50]}...")
            except Exception as e:
                print(f"✗ Failed to create index: {e}")

if __name__ == "__main__":
    add_performance_indexes()
