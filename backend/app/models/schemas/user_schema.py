from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.domain.user import CarbonBaseline, ConsentInfo, UserPreferences


class UserCreate(BaseModel):
    email: EmailStr
    displayName: str
    consent: ConsentInfo


class BaselineUpdate(BaseModel):
    transport: float
    energy: float
    diet: float


class UserResponse(BaseModel):
    userId: str
    email: EmailStr
    displayName: str
    role: str
    createdAt: datetime
    updatedAt: datetime
    carbonBaseline: CarbonBaseline
    preferences: UserPreferences
    consent: ConsentInfo
    deletionRequested: datetime | None = None
