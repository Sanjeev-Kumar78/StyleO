import secrets
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    MONGO_URI: str = Field(
        default="mongodb://localhost:27017")
    DATABASE_URL: str = Field(
        default="mongodb://localhost:27017/styleo")
    SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_hex(32))
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    GOOGLE_CLIENT_ID: str = Field(default="")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
