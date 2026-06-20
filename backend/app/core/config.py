"""Application configuration module.

Defines environment-aware settings using Pydantic BaseSettings,
automatically loading values from ``.env`` files and environment variables.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the EcoTrack backend.

    Attributes:
        PROJECT_ID: Google Cloud project identifier.
        REGION: Default GCP region for Cloud Run deployments.
        ENVIRONMENT: Runtime environment (development, staging, production).
        VERTEX_AI_LOCATION: GCP region for Vertex AI model invocations.
        ANONYMIZATION_KEY_SECRET_NAME: Secret Manager key name for HMAC anonymization.
        DELETION_GRACE_PERIOD_DAYS: Days to wait before purging deleted accounts.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_ID: str = Field(
        default="gen-lang-client-0849880096", validation_alias="PROJECT_ID"
    )
    REGION: str = Field(default="us-central1", validation_alias="REGION")
    ENVIRONMENT: str = Field(default="development", validation_alias="ENVIRONMENT")

    # Vertex AI settings
    VERTEX_AI_LOCATION: str = Field(
        default="us-central1", validation_alias="VERTEX_AI_LOCATION"
    )

    # Secret Manager configuration
    ANONYMIZATION_KEY_SECRET_NAME: str = Field(
        default="anonymization-hmac-key",
        validation_alias="ANONYMIZATION_KEY_SECRET_NAME",
    )

    # Deletion grace period in days (GDPR request lifecycle)
    DELETION_GRACE_PERIOD_DAYS: int = 7


settings = Settings()
