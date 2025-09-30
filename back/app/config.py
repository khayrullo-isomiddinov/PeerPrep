from pydantic_settings import BaseSettings
from typing import List, Union
import json

class Settings(BaseSettings):
    APP_NAME: str = "PeerPrep API"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = "sqlite:///./peerprep.db"
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    @classmethod
    def parse_origins(cls, v: Union[str, List[str]]):
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):  # JSON style: ["url1","url2"]
                return json.loads(v)
            return [s.strip() for s in v.split(",") if s.strip()]
        return []

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    # Pydantic v2: add field_validator for CORS_ORIGINS
    from pydantic import field_validator
    _normalize_cors = field_validator("CORS_ORIGINS", mode="before")(parse_origins)

settings = Settings()
