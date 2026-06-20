"""User request and response schemas for authentication endpoints."""

from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.domain.user import CarbonBaseline, ConsentInfo, UserPreferences


class UserCreate(BaseModel):
    """Request schema for user registration."""
    email: EmailStr
    displayName: str
    consent: ConsentInfo


class BaselineUpdate(BaseModel):
    """Request schema for updating carbon emission baselines."""
    transport: float
    energy: float
    diet: float


class UserResponse(BaseModel):
    """Response schema for user profile data."""
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
