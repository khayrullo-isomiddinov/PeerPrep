"""
Database migration to add performance indexes
"""
from sqlmodel import SQLModel, create_engine, text
from app.config import settings

def add_performance_indexes():
    """Add indexes for frequently queried fields"""
    connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
    engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
    
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_event_created_at ON event(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_event_starts_at ON event(starts_at ASC)",
        "CREATE INDEX IF NOT EXISTS idx_event_created_by ON event(created_by)",
        "CREATE INDEX IF NOT EXISTS idx_event_group_id ON event(group_id)",
        
        "CREATE INDEX IF NOT EXISTS idx_group_created_at ON \"group\"(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_group_field ON \"group\"(field)",
        "CREATE INDEX IF NOT EXISTS idx_group_created_by ON \"group\"(created_by)",
        
        "CREATE INDEX IF NOT EXISTS idx_groupmember_user_group ON groupmember(user_id, group_id)",
        "CREATE INDEX IF NOT EXISTS idx_groupmember_is_leader ON groupmember(is_leader) WHERE is_leader = TRUE",
        "CREATE INDEX IF NOT EXISTS idx_eventattendee_user_event ON eventattendee(user_id, event_id)",
        
        "CREATE INDEX IF NOT EXISTS idx_groupmessage_group_created ON groupmessage(group_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_groupmessage_user ON groupmessage(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_eventmessage_event_created ON eventmessage(event_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_eventmessage_user ON eventmessage(user_id)",
        
        "CREATE INDEX IF NOT EXISTS idx_missionsubmission_group_submitted ON missionsubmission(group_id, submitted_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_missionsubmission_user ON missionsubmission(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_missionsubmission_approved ON missionsubmission(is_approved) WHERE is_approved = TRUE",
        
        "CREATE INDEX IF NOT EXISTS idx_messageread_message_type ON messageread(message_id, message_type)",
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


