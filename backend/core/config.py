import secrets
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    DATABASE_URL: str = Field(
        default="mongodb://localhost:27017/styleo")
    SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32))
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    GOOGLE_CLIENT_ID: str = Field(default="")
    REDIS_PASSWORD: str = Field(default="")
    REDIS_DB_URL: str = Field(default="redis://localhost:6379")
    COOKIE_SECURE: bool = Field(default=True)

    # Gemini AI
    GEMINI_API_KEY: str = Field(default="")

    # Voyage AI Embedding API
    VOYAGE_API_KEY: str = Field(default="")
    VOYAGE_EMBEDDING_MODEL: str = Field(default="voyage-multimodal-3.5")

    # Background removal / ONNXRuntime
    REMBG_ENABLE_GPU: bool = Field(default=False)

    # Logging
    LOG_LEVEL: str = Field(default="INFO")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",
    )


settings = Settings()
