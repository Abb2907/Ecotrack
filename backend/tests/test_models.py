"""Tests for Pydantic domain models and schema validation.

Verifies that domain models enforce field constraints and produce
expected serialization output.
"""

from datetime import datetime

import pytest
from pydantic import ValidationError

from app.models.domain.action import Action
from app.models.domain.log import DailyLog
from app.models.domain.user import CarbonBaseline, ConsentInfo, User, UserPreferences
from app.models.schemas.log_schema import LogCreate
from app.models.schemas.user_schema import BaselineUpdate, UserCreate


class TestActionModel:
    """Test suite for the Action domain model."""

    def test_valid_action_creation(self) -> None:
        """Test creating a valid action with all required fields."""
        action = Action(
            actionId="test_action",
            title="Test Action",
            description="A test eco-friendly action.",
            category="transport",
            baseReduction=0.5,
            unit="km",
            difficulty="easy",
            costImpact="savings",
            estimatedSavings=10.0,
        )
        assert action.actionId == "test_action"
        assert action.category == "transport"

    def test_action_serialization(self) -> None:
        """Test that model_dump produces expected dictionary output."""
        action = Action(
            actionId="bike",
            title="Bike",
            description="Cycle to work",
            category="transport",
            baseReduction=0.21,
            unit="km",
            difficulty="easy",
            costImpact="savings",
            estimatedSavings=15.0,
        )
        data = action.model_dump()
        assert isinstance(data, dict)
        assert data["baseReduction"] == 0.21


class TestDailyLogModel:
    """Test suite for the DailyLog domain model."""

    def test_valid_log_creation(self) -> None:
        """Test creating a valid daily log entry."""
        log = DailyLog(
            logId="user1_2024-01-01_bike",
            userId="user1",
            actionId="bike",
            category="transport",
            date="2024-01-01",
            quantity=10.0,
            co2Reduced=2.1,
        )
        assert log.logId == "user1_2024-01-01_bike"
        assert log.co2Reduced == 2.1

    def test_log_default_created_at(self) -> None:
        """Test that createdAt defaults to current time."""
        log = DailyLog(
            logId="test",
            userId="u1",
            actionId="a1",
            category="diet",
            date="2024-06-01",
            quantity=1.0,
            co2Reduced=3.2,
        )
        assert isinstance(log.createdAt, datetime)


class TestCarbonBaseline:
    """Test suite for the CarbonBaseline model."""

    def test_default_values(self) -> None:
        """Test that all baseline values default to zero."""
        baseline = CarbonBaseline()
        assert baseline.transport == 0.0
        assert baseline.energy == 0.0
        assert baseline.diet == 0.0
        assert baseline.total == 0.0

    def test_custom_values(self) -> None:
        """Test setting custom baseline values."""
        baseline = CarbonBaseline(transport=5.0, energy=10.0, diet=3.0, total=18.0)
        assert baseline.total == 18.0


class TestLogCreateSchema:
    """Test suite for the LogCreate request schema."""

    def test_valid_log_create(self) -> None:
        """Test creating a valid log create request."""
        payload = LogCreate(actionId="bike", quantity=5.0, date="2024-06-15")
        assert payload.actionId == "bike"

    def test_invalid_date_format(self) -> None:
        """Test that invalid date format is rejected."""
        with pytest.raises(ValidationError):
            LogCreate(actionId="bike", quantity=5.0, date="15/06/2024")

    def test_negative_quantity_rejected(self) -> None:
        """Test that negative quantity is rejected by Pydantic validation."""
        with pytest.raises(ValidationError):
            LogCreate(actionId="bike", quantity=-1.0, date="2024-06-15")

    def test_zero_quantity_rejected(self) -> None:
        """Test that zero quantity is rejected (must be greater than 0)."""
        with pytest.raises(ValidationError):
            LogCreate(actionId="bike", quantity=0, date="2024-06-15")


class TestBaselineUpdateSchema:
    """Test suite for the BaselineUpdate request schema."""

    def test_valid_baseline_update(self) -> None:
        """Test creating a valid baseline update payload."""
        payload = BaselineUpdate(transport=10.0, energy=20.0, diet=5.0)
        assert payload.transport == 10.0
        assert payload.energy == 20.0
        assert payload.diet == 5.0
