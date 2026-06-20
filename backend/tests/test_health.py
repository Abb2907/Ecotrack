"""Tests for the application health check endpoint."""

from fastapi.testclient import TestClient


def test_health_check(client: TestClient) -> None:
    """Test that the health endpoint returns a healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "environment" in data


def test_health_check_response_format(client: TestClient) -> None:
    """Test health endpoint returns exactly two keys."""
    response = client.get("/health")
    data = response.json()
    assert set(data.keys()) == {"status", "environment"}
