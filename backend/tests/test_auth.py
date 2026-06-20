""" "Tests for user authentication and profile management API endpoints."""

from collections.abc import Generator
from datetime import datetime
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.domain.user import CarbonBaseline, ConsentInfo, User, UserPreferences
from app.repositories.user_repository import UserRepository


@pytest.fixture(autouse=True)
def mock_user_repository() -> Generator[AsyncMock, None, None]:
    # Mocks the UserRepository so we don't interface with a live Firestore database
    mock_repo = AsyncMock(spec=UserRepository)

    test_user = User(
        userId="test-user-123",
        email="testuser@example.com",
        displayName="Test User",
        role="user",
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow(),
        carbonBaseline=CarbonBaseline(
            transport=10.0, energy=20.0, diet=30.0, total=60.0
        ),
        preferences=UserPreferences(),
        consent=ConsentInfo(
            dataProcessingAccepted=True,
            consentTimestamp=datetime.utcnow(),
            consentVersion="v1",
        ),
    )

    mock_repo.get_user.return_value = test_user
    mock_repo.create_user.return_value = test_user
    mock_repo.update_user.return_value = None
    mock_repo.update_baseline.return_value = None

    # Override the repository dependency instantiation in our endpoints
    app.dependency_overrides[UserRepository] = lambda: mock_repo
    yield mock_repo
    if UserRepository in app.dependency_overrides:
        del app.dependency_overrides[UserRepository]


def test_get_current_user_profile(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["userId"] == "test-user-123"
    assert data["email"] == "testuser@example.com"
    assert data["displayName"] == "Test User"
    assert data["carbonBaseline"]["total"] == 60.0


def test_update_carbon_baseline(client: TestClient) -> None:
    payload = {"transport": 100.0, "energy": 200.0, "diet": 50.0}
    response = client.put("/api/v1/auth/baseline", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Assert data return (still mapped to mock_repo.get_user return object)
    assert data["userId"] == "test-user-123"
    assert data["carbonBaseline"]["transport"] == 10.0
