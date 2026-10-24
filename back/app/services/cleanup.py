"""Removes rows that belong to a deleted event or user.

SQLite doesn't enforce foreign keys here, so without this, deleting an event or account
leaves orphaned attendees, messages, read receipts and whiteboard items behind.
"""
from sqlmodel import Session, select, delete

from app.models import Event, EventAttendee, EventMessage, MessageRead, WhiteboardElement, User


def delete_event_data(session: Session, event_id: int) -> None:
    """Delete everything attached to an event (but not the event row itself)."""
    message_ids = session.exec(select(EventMessage.id).where(EventMessage.event_id == event_id)).all()
    if message_ids:
        session.exec(delete(MessageRead).where(
            MessageRead.message_type == "event",
            MessageRead.message_id.in_(message_ids),
        ))
    session.exec(delete(EventMessage).where(EventMessage.event_id == event_id))
    session.exec(delete(EventAttendee).where(EventAttendee.event_id == event_id))
    session.exec(delete(WhiteboardElement).where(WhiteboardElement.event_id == event_id))


def delete_user_data(session: Session, user: User) -> None:
    """Delete a user's own events (with their data) and their participation in other events."""
    for event_id in session.exec(select(Event.id).where(Event.created_by == user.id)).all():
        delete_event_data(session, event_id)
        session.exec(delete(Event).where(Event.id == event_id))

    session.exec(delete(EventAttendee).where(EventAttendee.user_id == user.id))
    session.exec(delete(MessageRead).where(MessageRead.user_id == user.id))
    message_ids = session.exec(select(EventMessage.id).where(EventMessage.user_id == user.id)).all()
    if message_ids:
        session.exec(delete(MessageRead).where(
            MessageRead.message_type == "event",
            MessageRead.message_id.in_(message_ids),
        ))
    session.exec(delete(EventMessage).where(EventMessage.user_id == user.id))
