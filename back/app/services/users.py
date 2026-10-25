"""How a user appears to other people. Email addresses are private: they are only ever returned to their owner."""
from app.models import User


def display_name(user: User) -> str:
    """The name someone chose, or the part of their email before the @ until they set one."""
    return user.name or user.email.split("@")[0]


def public_user(user: User) -> dict:
    """The fields of a user that anyone may see."""
    return {
        "id": user.id,
        "name": display_name(user),
        "photo_url": user.photo_url,
        "is_verified": user.is_verified,
    }
