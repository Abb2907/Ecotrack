"""Action response schemas for API serialization."""

from pydantic import BaseModel


class ActionResponse(BaseModel):
    """API response schema for eco-action catalog items."""
    actionId: str
    title: str
    description: str
    category: str
    baseReduction: float
    unit: str
    difficulty: str
    costImpact: str
    estimatedSavings: float
