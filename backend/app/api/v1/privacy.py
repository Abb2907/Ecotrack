import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import RoleChecker, get_current_user
from app.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/privacy", tags=["GDPR & Privacy Compliance"])


@router.get("/export", response_model=dict[str, Any])
async def export_my_data(
    current_user_claims: dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository),
) -> dict[str, Any]:
    """
    Self-serve GDPR Data Portability (Art. 20). 
    Exports all user data including profile records, carbon baseline settings, 
    daily activity logs, and Vertex AI recommendation histories.
    """
    uid = current_user_claims["uid"]
    req_id = str(uuid.uuid4())
    logger.info(f"DATA_EXPORT_REQUEST: id={req_id} user={uid} timestamp={datetime.utcnow().isoformat()}")
    
    data = await user_repo.export_user_data(uid)
    if not data:
        logger.warning(f"DATA_EXPORT_FAILURE: id={req_id} user={uid} reason='No user data found'")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user data found to export.",
        )
        
    logger.info(f"DATA_EXPORT_SUCCESS: id={req_id} user={uid}")
    return data


@router.post("/delete", status_code=status.HTTP_202_ACCEPTED)
async def schedule_account_deletion(
    current_user_claims: dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository),
) -> dict[str, Any]:
    """
    Initiate user account deletion (Art. 17). 
    This is an asynchronous **soft delete**. It sets a deletion flag and schedules 
    complete profile and log deletion in 7 days (hard delete).
    Returns a status response indicating the scheduled purge date.
    """
    uid = current_user_claims["uid"]
    req_id = str(uuid.uuid4())
    logger.info(f"DELETE_SCHEDULE_REQUEST: id={req_id} user={uid} timestamp={datetime.utcnow().isoformat()}")
    
    try:
        deletion_time = await user_repo.flag_for_deletion(uid)
        purge_date = deletion_time + timedelta(days=7)
        logger.info(f"DELETE_SCHEDULE_SUCCESS: id={req_id} user={uid} purge_date={purge_date.isoformat()}")

        return {
            "status": "deletion_scheduled",
            "message": "Your account has been scheduled for deletion.",
            "scheduledDeletionDate": purge_date.isoformat(),
            "gracePeriodDays": 7,
            "instructions": "You can log back in and cancel this request anytime within the next 7 days.",
        }
    except Exception as e:
        logger.error(f"DELETE_SCHEDULE_FAILURE: id={req_id} user={uid} reason='{str(e)}'")
        raise


@router.post("/delete/cancel", status_code=status.HTTP_200_OK)
async def cancel_account_deletion(
    current_user_claims: dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository),
) -> dict[str, str]:
    """
    Cancels a pending account deletion request and restores active account status.
    This reverses a previous soft delete.
    """
    uid = current_user_claims["uid"]
    req_id = str(uuid.uuid4())
    logger.info(f"DELETE_CANCEL_REQUEST: id={req_id} user={uid} timestamp={datetime.utcnow().isoformat()}")
    
    user = await user_repo.get_user(uid)
    if not user or not user.deletionRequested:
        logger.warning(f"DELETE_CANCEL_FAILURE: id={req_id} user={uid} reason='No active deletion request'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active deletion request exists for this account.",
        )

    await user_repo.cancel_deletion(uid)
    logger.info(f"DELETE_CANCEL_SUCCESS: id={req_id} user={uid}")
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
