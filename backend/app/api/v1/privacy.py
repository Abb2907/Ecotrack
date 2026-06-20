from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import RoleChecker, get_current_user
from app.repositories.user_repository import UserRepository

router = APIRouter(prefix="/privacy", tags=["GDPR & Privacy Compliance"])


@router.get("/export", response_model=dict[str, Any])
async def export_my_data(
    current_user_claims: dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository),
) -> dict[str, Any]:
    """
    Self-serve GDPR Data Portability. Exports all user data including profile records,
    carbon baseline settings, daily activity logs, and Vertex AI recommendation histories.
    """
    uid = current_user_claims["uid"]
    data = await user_repo.export_user_data(uid)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user data found to export.",
        )
    return data


@router.post("/delete", status_code=status.HTTP_202_ACCEPTED)
async def schedule_account_deletion(
    current_user_claims: dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository),
) -> dict[str, Any]:
    """
    Initiate user account deletion. Schedules complete profile and log deletion in 7 days.
    """
    uid = current_user_claims["uid"]
    deletion_time = await user_repo.flag_for_deletion(uid)
    purge_date = deletion_time + timedelta(days=7)

    return {
        "status": "deletion_scheduled",
        "message": "Your account has been scheduled for deletion.",
        "scheduledDeletionDate": purge_date.isoformat(),
        "gracePeriodDays": 7,
        "instructions": "You can log back in and cancel this request anytime within the next 7 days.",
    }


@router.post("/delete/cancel", status_code=status.HTTP_200_OK)
async def cancel_account_deletion(
    current_user_claims: dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository),
) -> dict[str, str]:
    """
    Cancels a pending account deletion request and restores active account status.
    """
    uid = current_user_claims["uid"]
    user = await user_repo.get_user(uid)
    if not user or not user.deletionRequested:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active deletion request exists for this account.",
        )

    await user_repo.cancel_deletion(uid)
    return {"message": "Your account deletion request has been canceled successfully."}


@router.post(
    "/purge",
    dependencies=[Depends(RoleChecker(["admin", "super_admin"]))],
    status_code=status.HTTP_200_OK,
)
async def trigger_user_purge(
    user_repo: UserRepository = Depends(UserRepository),
) -> dict[str, Any]:
    """
    Admin-only endpoint to process and permanently purge scheduled deletion requests older than 7 days.
    """
    purged_count = await user_repo.purge_deleted_users()
    return {
        "status": "success",
        "purgedAccountsCount": purged_count,
        "timestamp": datetime.utcnow().isoformat(),
    }
