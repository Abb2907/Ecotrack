"""Action domain model for the eco-friendly action catalog."""

from pydantic import BaseModel, Field


class Action(BaseModel):
    """Represents a single eco-friendly action in the reduction catalog."""
    actionId: str = Field(
        ..., description="Unique Action Catalog ID (e.g. bike_commute)"
    )
    title: str
    description: str
    category: str = Field(..., description="transport | energy | diet")
    baseReduction: float = Field(..., description="kg CO2 reduced per unit")
    unit: str = Field(..., description="e.g. km, hour, meal")
    difficulty: str = Field(..., description="easy | medium | hard")
    costImpact: str = Field(..., description="savings | cost | neutral")
    estimatedSavings: float = Field(..., description="currency/unit saved")
