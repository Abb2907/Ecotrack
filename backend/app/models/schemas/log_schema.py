from datetime import datetime

from pydantic import BaseModel, Field


class LogCreate(BaseModel):
    actionId: str
    quantity: float = Field(..., gt=0, description="Must be greater than 0")
    date: str = Field(
        ..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Date formatted as YYYY-MM-DD"
    )


class LogResponse(BaseModel):
    logId: str
    userId: str
    actionId: str
    category: str
    date: str
    quantity: float
    co2Reduced: float
    createdAt: datetime
