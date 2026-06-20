from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CarbonBaseline(BaseModel):
    transport: float = 0.0
    energy: float = 0.0
    diet: float = 0.0
    total: float = 0.0


class ConsentInfo(BaseModel):
    dataProcessingAccepted: bool
    consentTimestamp: datetime
    consentVersion: str


class UserPreferences(BaseModel):
    theme: str = "dark"
    emailNotifications: bool = True


class User(BaseModel):
    userId: str = Field(..., description="Firebase Auth UID")
    email: EmailStr
    displayName: str
    role: str = Field(default="user")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    carbonBaseline: CarbonBaseline = Field(default_factory=CarbonBaseline)
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    consent: ConsentInfo
    deletionRequested: datetime | None = None
