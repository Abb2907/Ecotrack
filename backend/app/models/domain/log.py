from datetime import datetime
from pydantic import BaseModel, Field

class DailyLog(BaseModel):
    logId: str = Field(..., description="Composite log ID (userId_date_actionId)")
    userId: str
    actionId: str
    category: str = Field(..., description="transport | energy | diet")
    date: str = Field(..., description="YYYY-MM-DD")
    quantity: float
    co2Reduced: float = Field(..., description="kg CO2 reduced")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
