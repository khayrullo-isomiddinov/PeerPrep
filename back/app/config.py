from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "PeerPrep API"
    API_PREFIX: str = "/api"
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    DATABASE_URL: str = "sqlite:///./peerprep.db"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
