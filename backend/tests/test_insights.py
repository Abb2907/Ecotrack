"""Tests for AI insights API endpoints."""

from collections.abc import Generator
from datetime import datetime
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.api.v1.insights import get_vertex_client
from app.main import app
from app.models.domain.user import CarbonBaseline, ConsentInfo, User
from app.repositories.action_repository import ActionRepository
from app.repositories.user_repository import UserRepository
from app.services.vertex_client import (
    VertexAIClient,
    WeeklyRecommendations,
    RecommendationItem,
)


@pytest.fixture(autouse=True)
def mock_dependencies() -> Generator[dict[str, AsyncMock], None, None]:
    """Provide mocked dependencies for insights endpoints."""
    mock_user_repo = AsyncMock(spec=UserRepository)
    mock_action_repo = AsyncMock(spec=ActionRepository)
    mock_vertex_client = AsyncMock(spec=VertexAIClient)

    # Setup mocked User
    test_user = User(
        userId="test-user-123",
        email="test@example.com",
        displayName="Test",
        role="user",
        carbonBaseline=CarbonBaseline(transport=1.0, energy=2.0, diet=3.0, total=6.0),
        consent=ConsentInfo(
            dataProcessingAccepted=True,
            consentTimestamp=datetime.utcnow(),
            consentVersion="v1",
        ),
    )
    mock_user_repo.get_user.return_value = test_user

    # Setup insights query mock
    class MockStream:
        def __init__(self, data):
            self.data = data

        async def __aiter__(self):
            for item in self.data:
                yield item

    class MockQuery:
        def __init__(self, data=None):
            self.data = data or []

        def where(self, *args, **kwargs):
            return self

        def order_by(self, *args, **kwargs):
            return self

        def limit(self, *args, **kwargs):
            return self

        def stream(self):
            class Doc:
                def __init__(self, d):
                    self.d = d

                def to_dict(self):
                    return self.d

            return MockStream([Doc(d) for d in self.data])

        def document(self, doc_id):
            mock_doc_ref = AsyncMock()
            mock_doc_ref.set = AsyncMock()
            return mock_doc_ref

    # Setup for latest insights
    mock_user_repo.insights_ref = MockQuery(
        [
            {
                "insightId": "test_2023_w1",
                "userId": "test-user-123",
                "recommendations": [
                    {"title": "Use public transit", "description": "Saves 2kg"}
                ],
                "createdAt": datetime.utcnow(),
            }
        ]
    )

    # Setup for action logs
    mock_action_repo.logs_ref = MockQuery(
        [
            {
                "logId": "log1",
                "userId": "test-user-123",
                "actionId": "bike",
                "date": "2023-01-01",
                "quantity": 1,
                "co2Reduced": 2.0,
                "category": "transport",
            }
        ]
    )

    # Setup for Vertex Client
    mock_rec = RecommendationItem(
        title="Generated",
        description="Gen desc",
        estimatedCO2Reduction=2.0,
        estimatedCostImpact="",
        impact="high",
        difficulty="easy",
        timeframe="short-term",
    )
    mock_vertex_client.generate_weekly_recommendations.return_value = (
        WeeklyRecommendations(recommendations=[mock_rec, mock_rec])
    )

    app.dependency_overrides[UserRepository] = lambda: mock_user_repo
    app.dependency_overrides[ActionRepository] = lambda: mock_action_repo
    app.dependency_overrides[get_vertex_client] = lambda: mock_vertex_client

    yield {
        "user_repo": mock_user_repo,
        "action_repo": mock_action_repo,
        "vertex": mock_vertex_client,
    }

    app.dependency_overrides.clear()


def test_get_latest_insights(client: TestClient) -> None:
    """Test retrieving latest insights."""
    response = client.get("/api/v1/insights/latest")
    assert response.status_code == 200
    data = response.json()
    assert data["insightId"] == "test_2023_w1"
    assert "recommendations" in data


def test_get_latest_insights_not_found(
    client: TestClient, mock_dependencies: dict
) -> None:
    """Test getting insights when none exist."""
    mock_dependencies["user_repo"].insights_ref.data = []
    response = client.get("/api/v1/insights/latest")
    assert response.status_code == 404


def test_generate_insights(client: TestClient) -> None:
    """Test generating new insights."""
    response = client.post("/api/v1/insights/generate")
    assert response.status_code == 200
    data = response.json()
    assert "Generated" in data["recommendations"][0]["title"]
    assert "insightId" in data
    assert "userId" in data
