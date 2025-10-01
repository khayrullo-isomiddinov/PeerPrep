from pydantic_settings import BaseSettings
from typing import List, Union
import json
from pydantic import field_validator

class Settings(BaseSettings):
    APP_NAME: str = "PeerPrep API"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = "sqlite:///./peerprep.db"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "https://khayrullo-isomiddinov.github.io"
    ]
    BACKEND_BASE_URL: str = "http://localhost:8000"

    SMTP_SERVER: str
    SMTP_PORT: int
    EMAIL_USER: str
    EMAIL_PASS: str

    SECRET_KEY: str = "change_me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15

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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
