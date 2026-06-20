from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.models.domain.user import CarbonBaseline, User, UserPreferences
from app.models.schemas.user_schema import BaselineUpdate, UserCreate, UserResponse
from app.repositories.user_repository import UserRepository

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register_user(
    payload: UserCreate,
    current_user_claims: dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository),
) -> UserResponse:
    uid = current_user_claims["uid"]

    # Check if user already exists
    existing_user = await user_repo.get_user(uid)
    if existing_user:
        # Update user display name or email if they have changed
        updates = {}
        if existing_user.displayName != payload.displayName:
            updates["displayName"] = payload.displayName
        if existing_user.email != payload.email:
            updates["email"] = payload.email
        if updates:
            await user_repo.update_user(uid, updates)
            existing_user = await user_repo.get_user(uid)
        return UserResponse(**existing_user.model_dump())

    # Create new user record
    new_user = User(
        userId=uid,
        email=payload.email,
        displayName=payload.displayName,
        role="user",
        carbonBaseline=CarbonBaseline(transport=0.0, energy=0.0, diet=0.0, total=0.0),
        preferences=UserPreferences(theme="dark", emailNotifications=True),
        consent=payload.consent,
    )

    await user_repo.create_user(new_user)
    return UserResponse(**new_user.model_dump())


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user_claims: dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository),
) -> UserResponse:
    uid = current_user_claims["uid"]
    user = await user_repo.get_user(uid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Please register first.",
        )
    return UserResponse(**user.model_dump())


@router.put("/baseline", response_model=UserResponse)
async def update_my_baseline(
    payload: BaselineUpdate,
    current_user_claims: dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository),
) -> UserResponse:
    uid = current_user_claims["uid"]
    user = await user_repo.get_user(uid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found."
        )

    total = payload.transport + payload.energy + payload.diet
    new_baseline = CarbonBaseline(
        transport=payload.transport,
        energy=payload.energy,
        diet=payload.diet,
        total=total,
    )

    await user_repo.update_baseline(uid, new_baseline)

    updated_user = await user_repo.get_user(uid)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve updated profile",
        )
    return UserResponse(**updated_user.model_dump())
