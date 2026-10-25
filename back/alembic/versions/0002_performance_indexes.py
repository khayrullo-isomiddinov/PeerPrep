"""performance indexes for event listing and membership lookups

Replaces the old manual app/migrations/add_indexes.py script, which was never run automatically.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-25
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # if_not_exists: databases where someone ran the old manual script already have these
    op.create_index("idx_event_created_at", "event", ["created_at"], if_not_exists=True)
    op.create_index("idx_event_starts_at", "event", ["starts_at"], if_not_exists=True)
    op.create_index("idx_eventattendee_user_event", "eventattendee", ["user_id", "event_id"], if_not_exists=True)


def downgrade() -> None:
    op.drop_index("idx_eventattendee_user_event", table_name="eventattendee", if_exists=True)
    op.drop_index("idx_event_starts_at", table_name="event", if_exists=True)
    op.drop_index("idx_event_created_at", table_name="event", if_exists=True)
