"""Tests for GDPR privacy compliance API endpoints.

Validates data export, account deletion scheduling, cancellation,
and admin purge operations with mocked Firestore dependencies.
"""

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
    """Provide a mocked UserRepository for all privacy endpoint tests."""
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
        deletionRequested=None,
    )

    mock_repo.get_user.return_value = test_user
    mock_repo.export_user_data.return_value = {
        "profile": test_user.model_dump(),
        "logs": [],
        "insights": [],
    }
    mock_repo.flag_for_deletion.return_value = datetime.utcnow()
    mock_repo.cancel_deletion.return_value = None
    mock_repo.purge_deleted_users.return_value = 0

    app.dependency_overrides[UserRepository] = lambda: mock_repo
    yield mock_repo
    if UserRepository in app.dependency_overrides:
        del app.dependency_overrides[UserRepository]


def test_export_user_data(client: TestClient) -> None:
    """Test GDPR data export returns user profile, logs, and insights."""
    response = client.get("/api/v1/privacy/export")
    assert response.status_code == 200
    data = response.json()
    assert "profile" in data
    assert "logs" in data
    assert "insights" in data
    assert data["profile"]["userId"] == "test-user-123"


def test_schedule_account_deletion(client: TestClient) -> None:
    """Test scheduling an account deletion returns confirmation details."""
    response = client.post("/api/v1/privacy/delete")
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "deletion_scheduled"
    assert data["gracePeriodDays"] == 7
    assert "scheduledDeletionDate" in data


def test_cancel_deletion_without_pending_request(
    client: TestClient, mock_user_repository: AsyncMock
) -> None:
    """Test cancelling deletion when no request is pending returns 400."""
    # User has no pending deletion
    test_user = mock_user_repository.get_user.return_value
    test_user.deletionRequested = None
    mock_user_repository.get_user.return_value = test_user

    response = client.post("/api/v1/privacy/delete/cancel")
    assert response.status_code == 400
