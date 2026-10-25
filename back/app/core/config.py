from pathlib import Path
from typing import List, Union
import json
import secrets
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    APP_NAME: str = "PeerPrep API"
    # "production" turns off the interactive API docs and enables HSTS
    ENVIRONMENT: str = "development"
    API_PREFIX: str = "/api"

    DATABASE_URL: str = "sqlite:///./peerprep.db"

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Optional regex for extra allowed origins, e.g. Vercel's per-deployment preview URLs
    CORS_ORIGIN_REGEX: str = ""

    BACKEND_BASE_URL: str = "http://localhost:8000"
    FRONTEND_BASE_URL: str = "http://localhost:5173"
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    EMAIL_USER: str = ""
    EMAIL_PASS: str = ""

    # Signs login tokens. Set it in .env; if it's missing, one is generated and saved (see below).
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # When a verification email can't be sent, return the link in the API response so sign-up still works.
    # That lets anyone verify an address they don't own, so turn it off once email sending works.
    VERIFY_LINK_FALLBACK: bool = True

    OPENAI_API_KEY: str = ""

    # The account that owns the sample events. With no ADMIN_PASSWORD it gets a random one nobody knows.
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: str = ""

    @classmethod
    def parse_origins(cls, v: Union[str, List[str]]):
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return json.loads(v)
            return [s.strip() for s in v.split(",") if s.strip()]
        return []

    _normalize_cors = field_validator("CORS_ORIGINS", mode="before")(parse_origins)

    @field_validator("SECRET_KEY")
    @classmethod
    def ensure_secret_key(cls, v: str) -> str:
        if v and v not in WEAK_SECRET_KEYS:
            return v
        return _load_or_create_secret_key()

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Placeholder values that must never be used to sign tokens
WEAK_SECRET_KEYS = {"change_me", "admin123", "secret", "changeme"}
SECRET_KEY_FILE = Path(__file__).resolve().parents[2] / ".secret_key"


def _load_or_create_secret_key() -> str:
    """Reuse the key saved in back/.secret_key, or generate one the first time.

    Persisting it means restarts don't log everyone out. The file is git-ignored.
    """
    if SECRET_KEY_FILE.exists():
        saved = SECRET_KEY_FILE.read_text(encoding="utf-8").strip()
        if saved:
            return saved
    key = secrets.token_urlsafe(64)
    SECRET_KEY_FILE.write_text(key, encoding="utf-8")
    print(f"SECRET_KEY not set; generated one and saved it to {SECRET_KEY_FILE}. Set SECRET_KEY explicitly in production.")
    return key


settings = Settings()
