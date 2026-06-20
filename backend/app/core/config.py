import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_ID: str = Field(default="gen-lang-client-0849880096", validation_alias="PROJECT_ID")
    REGION: str = Field(default="us-central1", validation_alias="REGION")
    ENVIRONMENT: str = Field(default="development", validation_alias="ENVIRONMENT")

    # Vertex AI settings
    VERTEX_AI_LOCATION: str = Field(default="us-central1", validation_alias="VERTEX_AI_LOCATION")

    # Secret Manager configuration
    ANONYMIZATION_KEY_SECRET_NAME: str = Field(default="anonymization-hmac-key", validation_alias="ANONYMIZATION_KEY_SECRET_NAME")

    # Deletion grace period in days (GDPR request lifecycle)
    DELETION_GRACE_PERIOD_DAYS: int = 7

settings = Settings()

