import os
import pytest
from typing import Generator, Dict, Any
from fastapi.testclient import TestClient

# Set testing environment variables before importing app
os.environ["ENVIRONMENT"] = "development"
os.environ["PROJECT_ID"] = "ecotrack-test-project"
os.environ["VERTEX_AI_LOCATION"] = "us-central1"
os.environ["ANONYMIZATION_KEY_SECRET_NAME"] = "anonymization-hmac-key"
os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"

from app.main import app
from app.core.security import get_current_user

# Simple dependency bypass for authentication token validation during unit tests
async def mock_get_current_user() -> Dict[str, str]:
    return {
        "uid": "test-user-123",
        "email": "testuser@example.com",
        "name": "Test User",
        "role": "user"
    }

@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    # Override authentication dependency
    app.dependency_overrides[get_current_user] = mock_get_current_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
