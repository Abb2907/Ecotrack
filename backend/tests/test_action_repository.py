"""Tests for the ActionRepository."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.domain.action import Action
from app.models.domain.log import DailyLog
from app.repositories.action_repository import ActionRepository


@pytest.fixture
def action_repo() -> ActionRepository:
    """Provide a configured ActionRepository with a mocked Firestore DB."""

    # We subclass to override the __init__ to avoid touching the real Firestore client
    class MockedActionRepo(ActionRepository):
        def __init__(self):
            self.db = MagicMock()
            self.actions_ref = MagicMock()
            self.logs_ref = MagicMock()

    return MockedActionRepo()


@pytest.mark.asyncio
async def test_get_action(action_repo: ActionRepository) -> None:
    """Test retrieving an action by ID."""
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        "actionId": "test_action",
        "title": "Test",
        "description": "Test desc",
        "category": "energy",
        "baseReduction": 1.0,
        "unit": "kwh",
        "difficulty": "easy",
        "costImpact": "neutral",
        "estimatedSavings": 0.0,
    }

    # Mocking document().get() chaining
    doc_ref = MagicMock()
    doc_ref.get = AsyncMock(return_value=mock_doc)
    action_repo.actions_ref.document.return_value = doc_ref

    action = await action_repo.get_action("test_action")

    assert action is not None
    assert action.actionId == "test_action"
    assert action.category == "energy"


@pytest.mark.asyncio
async def test_create_action(action_repo: ActionRepository) -> None:
    """Test creating a new action."""
    doc_ref = MagicMock()
    doc_ref.set = AsyncMock()
    action_repo.actions_ref.document.return_value = doc_ref

    action = Action(
        actionId="new_action",
        title="New Action",
        description="Desc",
        category="transport",
        baseReduction=2.0,
        unit="km",
        difficulty="easy",
        costImpact="neutral",
        estimatedSavings=0.0,
    )

    result = await action_repo.create_action(action)

    assert result == action
    doc_ref.set.assert_called_once_with(action.model_dump())


@pytest.mark.asyncio
async def test_get_actions(action_repo: ActionRepository) -> None:
    """Test retrieving multiple actions."""

    class MockStream:
        def __init__(self, docs):
            self.docs = docs

        async def __aiter__(self):
            for doc in self.docs:
                yield doc

    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {
        "actionId": "test_action",
        "title": "Test",
        "description": "Test desc",
        "category": "transport",
        "baseReduction": 1.0,
        "unit": "km",
        "difficulty": "easy",
        "costImpact": "neutral",
        "estimatedSavings": 0.0,
    }

    # actions_ref returns MockStream when .stream() is called
    action_repo.actions_ref.stream.return_value = MockStream([mock_doc])

    actions = await action_repo.get_actions()

    assert len(actions) == 1
    assert actions[0].actionId == "test_action"


@pytest.mark.asyncio
async def test_log_reduction(action_repo: ActionRepository) -> None:
    """Test logging an action reduction."""
    doc_ref = MagicMock()
    doc_ref.set = AsyncMock()
    action_repo.logs_ref.document.return_value = doc_ref

    log = DailyLog(
        logId="log_123",
        userId="user_1",
        actionId="test_action",
        date="2023-01-01",
        category="transport",
        quantity=1.0,
        co2Reduced=2.0,
    )

    result = await action_repo.log_reduction(log)

    assert result == log
    doc_ref.set.assert_called_once_with(log.model_dump())
