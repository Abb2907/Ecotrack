from pydantic import BaseModel


class ActionResponse(BaseModel):
    actionId: str
    title: str
    description: str
    category: str
    baseReduction: float
    unit: str
    difficulty: str
    costImpact: str
    estimatedSavings: float
