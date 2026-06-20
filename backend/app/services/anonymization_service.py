import hashlib
import hmac
from typing import Optional
from google.cloud import secretmanager
from app.core.config import settings

class AnonymizationService:
    def __init__(self) -> None:
        self.project_id = settings.PROJECT_ID
        self.secret_name = settings.ANONYMIZATION_KEY_SECRET_NAME
        self._cached_key: Optional[bytes] = None

    async def _get_secret_key(self) -> bytes:
        if self._cached_key is not None:
            return self._cached_key

        # In local development, bypass Secret Manager connection check if not set up
        if settings.ENVIRONMENT == "development":
            self._cached_key = b"mock-development-hmac-anonymization-key-32byteslong!"
            return self._cached_key

        try:
            client = secretmanager.SecretManagerServiceClient()
            # Fetch latest version of the secret key
            name = f"projects/{self.project_id}/secrets/{self.secret_name}/versions/latest"
            response = client.access_secret_version(request={"name": name})
            self._cached_key = response.payload.data
            return self._cached_key
        except Exception as e:
            if settings.ENVIRONMENT == "production":
                raise RuntimeError(
                    f"Production Secret Manager Access Error (HMAC Anonymization Key): {str(e)}"
                ) from e
            # Log failure in non-production environments and fallback gracefully
            self._cached_key = b"mock-development-fallback-hmac-anonymization-key"
            return self._cached_key

    async def anonymize_user_id(self, user_id: str) -> str:
        """
        Computes HMAC-SHA256 on the User's UID to produce an irreversible cohortId.
        This cohortId is used when streaming telemetry statistics to BigQuery.
        """
        secret_key = await self._get_secret_key()
        h = hmac.new(secret_key, user_id.encode("utf-8"), hashlib.sha256)
        return h.hexdigest()
