from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_env: str = "local"
    db_url: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()