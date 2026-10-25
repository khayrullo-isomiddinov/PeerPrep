"""Validation shared by the schemas for things users upload or link to.

Images and files are stored as base64 data URLs. Anything that ends up in an <img src> or <a href> in
someone else's browser is checked here, so a stored `javascript:` link can never reach another user.
"""
import json
import re
from typing import Optional

IMAGE_DATA_URL = re.compile(r"^data:image/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$")
FILE_DATA_URL = re.compile(r"^data:[\w.+-]+/[\w.+-]+(;[\w=.-]+)*;base64,[A-Za-z0-9+/=]*$")

# base64 is 4/3 the size of the file, plus the data URL prefix
MAX_IMAGE_CHARS = 7 * 1024 * 1024        # 5 MB images
MAX_MATERIAL_CHARS = 14 * 1024 * 1024    # 10 MB per file
MAX_MATERIALS = 10
MAX_MATERIALS_CHARS = 45 * 1024 * 1024   # all files together


def image_url(field: str):
    """An uploaded image (data URL), an https link, or empty."""
    def check(v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return v
        if len(v) > MAX_IMAGE_CHARS:
            raise ValueError(f"{field} must be smaller than 5 MB")
        if v.startswith("https://") and len(v) <= 2048 and not re.search(r"\s", v):
            return v
        if IMAGE_DATA_URL.match(v):
            return v
        raise ValueError(f"{field} must be a JPG, PNG, GIF or WebP image")
    return check


def optional_text(field: str, max_length: int):
    def check(v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if len(v) > max_length:
            raise ValueError(f"{field} must be at most {max_length} characters")
        return v or None
    return check


def check_study_materials(v: Optional[str]) -> Optional[str]:
    """A JSON list of {name, type, size, data} where data is a base64 data URL."""
    if v is None or v == "":
        return None
    if len(v) > MAX_MATERIALS_CHARS:
        raise ValueError("Study materials are too large in total (keep them under about 30 MB)")
    try:
        items = json.loads(v)
    except ValueError:
        raise ValueError("Study materials are not in the expected format")
    if not isinstance(items, list) or len(items) > MAX_MATERIALS:
        raise ValueError(f"You can attach up to {MAX_MATERIALS} files")
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Study materials are not in the expected format")
        name, data = item.get("name"), item.get("data")
        if not isinstance(name, str) or not 0 < len(name) <= 255:
            raise ValueError("Each file needs a name of at most 255 characters")
        if not isinstance(data, str) or len(data) > MAX_MATERIAL_CHARS or not FILE_DATA_URL.match(data):
            raise ValueError(f"{name} is not a valid file or is larger than 10 MB")
        if not isinstance(item.get("type", ""), str) or not isinstance(item.get("size", 0), int):
            raise ValueError("Study materials are not in the expected format")
    return v
