"""AI-powered sustainability insights API routes.

Provides endpoints for retrieving and generating personalized weekly
recommendations using Vertex AI (Gemini) based on user activity logs.
"""

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.repositories.action_repository import ActionRepository
from app.repositories.user_repository import UserRepository
from app.services.vertex_client import VertexAIClient

router = APIRouter(prefix="/insights", tags=["Insights & AI Recommendations"])


# Dependency providers
def get_vertex_client() -> VertexAIClient:
    """Dependency provider for the Vertex AI client."""
    return VertexAIClient()


@router.get("/latest", response_model=dict[str, Any])
async def get_latest_insights(
    current_user_claims: dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository),
) -> dict[str, Any]:
    """Retrieve the most recent weekly AI-generated insights for the user.

    Args:
        current_user_claims: Authenticated user identity.
        user_repo: Injected user repository instance.

    Returns:
        The latest weekly insight document.

    Raises:
        HTTPException: If no insights have been generated yet.
    """
    uid = current_user_claims["uid"]

    # Query weekly insights collection for this user, ordered by creation time
    query = (
        user_repo.insights_ref.where("userId", "==", uid)
        .order_by("createdAt", direction="DESCENDING")
        .limit(1)
    )

    docs = [d async for d in query.stream()]
    if not docs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No weekly recommendations available yet. Trigger generation to create them.",
        )

    return docs[0].to_dict()


@router.post("/generate", response_model=dict[str, Any])
async def generate_insights(
    current_user_claims: dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository),
    action_repo: ActionRepository = Depends(ActionRepository),
    vertex_client: VertexAIClient = Depends(get_vertex_client),
) -> dict[str, Any]:
    """Generate fresh weekly sustainability recommendations via Vertex AI.

    Retrieves the user's carbon baseline and 7-day activity logs, submits
    them to Gemini for analysis, and persists the resulting recommendations.

    Args:
        current_user_claims: Authenticated user identity.
        user_repo: Injected user repository instance.
        action_repo: Injected action repository for log retrieval.
        vertex_client: Injected Vertex AI client.

    Returns:
        The generated insight document with recommendations.

    Raises:
        HTTPException: If the user profile is not found.
    """
    uid = current_user_claims["uid"]

    # 1. Fetch user to retrieve baseline info
    user = await user_repo.get_user(uid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Complete onboarding first.",
        )

    # 2. Fetch logged actions for the past 7 days
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
    recent_logs: list[dict[str, Any]] = []

    logs_query = (
        action_repo.logs_ref.where("userId", "==", uid)
        .where("date", ">=", seven_days_ago)
        .stream()
    )
    async for doc in logs_query:
        data = doc.to_dict()
        if data:
            recent_logs.append(data)

    # 3. Call Vertex AI (Gemini) with baseline and log trends
    baseline_info = {"carbonBaseline": user.carbonBaseline.model_dump()}

    recommendations_result = await vertex_client.generate_weekly_recommendations(
        baseline_info, recent_logs
    )

    # 4. Save recommendations to Firestore
    # composite ID pattern: {userId}_year_week
    now = datetime.utcnow()
    year, week_num, _ = now.isocalendar()
    insight_id = f"{uid}_{year}_w{week_num}"

    insight_doc = {
        "insightId": insight_id,
        "userId": uid,
        "weekStartDate": datetime.utcnow() - timedelta(days=now.weekday()),
        "recommendations": [
            r.model_dump() for r in recommendations_result.recommendations
        ],
        "createdAt": datetime.utcnow(),
    }

    await user_repo.insights_ref.document(insight_id).set(insight_doc)

    return insight_doc
