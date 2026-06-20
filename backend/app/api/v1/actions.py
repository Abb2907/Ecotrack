from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict
from app.core.security import get_current_user
from app.models.domain.log import DailyLog
from app.models.schemas.action_schema import ActionResponse
from app.models.schemas.log_schema import LogCreate, LogResponse
from app.repositories.action_repository import ActionRepository

router = APIRouter(prefix="/actions", tags=["Reduction Actions"])

@router.get("/catalog", response_model=List[ActionResponse])
async def get_action_catalog(
    category: Optional[str] = Query(None, description="Filter catalog by category: transport | energy | diet"),
    action_repo: ActionRepository = Depends(ActionRepository),
    current_user: dict = Depends(get_current_user)
) -> List[ActionResponse]:
    # Seed default actions if catalog is empty
    await action_repo.seed_default_actions()

    actions = await action_repo.get_actions(category)
    return [ActionResponse(**a.model_dump()) for a in actions]

@router.post("/log", response_model=LogResponse, status_code=status.HTTP_201_CREATED)
async def log_daily_action(
    payload: LogCreate,
    current_user_claims: Dict[str, str] = Depends(get_current_user),
    action_repo: ActionRepository = Depends(ActionRepository)
) -> LogResponse:
    uid = current_user_claims["uid"]

    # 1. Fetch action to retrieve conversion factors
    action = await action_repo.get_action(payload.actionId)
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action catalog item '{payload.actionId}' not found."
        )

    # 2. Compute the exact carbon footprint reduction
    co2_reduced = round(action.baseReduction * payload.quantity, 4)

    # 3. Formulate the composite log ID
    log_id = f"{uid}_{payload.date}_{payload.actionId}"

    new_log = DailyLog(
        logId=log_id,
        userId=uid,
        actionId=payload.actionId,
        category=action.category,
        date=payload.date,
        quantity=payload.quantity,
        co2Reduced=co2_reduced
    )

    # 4. Save to Firestore
    await action_repo.log_reduction(new_log)
    return LogResponse(**new_log.model_dump())

@router.get("/logs", response_model=List[LogResponse])
async def get_logged_actions(
    limit: int = Query(50, ge=1, le=100, description="Max logs to return"),
    offset: Optional[str] = Query(None, description="Cursor document ID for pagination"),
    current_user_claims: Dict[str, str] = Depends(get_current_user),
    action_repo: ActionRepository = Depends(ActionRepository)
) -> List[LogResponse]:
    uid = current_user_claims["uid"]
    logs = await action_repo.get_user_logs(uid, limit=limit, offset=offset)
    return [LogResponse(**log.model_dump()) for log in logs]

@router.delete("/logs/{logId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_logged_action(
    logId: str,
    current_user_claims: Dict[str, str] = Depends(get_current_user),
    action_repo: ActionRepository = Depends(ActionRepository)
) -> None:
    uid = current_user_claims["uid"]
    log = await action_repo.get_log(logId)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Logged action item not found."
        )

    # Security: Verify that the log belongs to the authenticated user
    if log.userId != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You cannot delete another user's activity log"
        )

    await action_repo.delete_log(logId)
