"""User domain models for profile, preferences, and consent management."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CarbonBaseline(BaseModel):
    """Carbon emission baseline values across transport, energy, and diet."""
    transport: float = 0.0
    energy: float = 0.0
    diet: float = 0.0
    total: float = 0.0


class ConsentInfo(BaseModel):
    """GDPR data processing consent record."""
    dataProcessingAccepted: bool
    consentTimestamp: datetime
    consentVersion: str


class UserPreferences(BaseModel):
    """User interface and notification preferences."""
    theme: str = "dark"
    emailNotifications: bool = True


class User(BaseModel):
    """Core user profile model stored in Firestore."""
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
