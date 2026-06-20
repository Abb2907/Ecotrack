from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from typing import Dict, List, Any
from app.core.security import get_current_user
from app.repositories.user_repository import UserRepository
from app.repositories.action_repository import ActionRepository
from app.services.vertex_client import VertexAIClient, WeeklyRecommendations

router = APIRouter(prefix="/insights", tags=["Insights & AI Recommendations"])

# Dependency providers
def get_vertex_client() -> VertexAIClient:
    return VertexAIClient()

@router.get("/latest", response_model=Dict[str, Any])
async def get_latest_insights(
    current_user_claims: Dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository)
) -> Dict[str, Any]:
    uid = current_user_claims["uid"]
    
    # Query weekly insights collection for this user, ordered by creation time
    query = user_repo.insights_ref.where("userId", "==", uid).order_by("createdAt", direction="DESCENDING").limit(1)
    
    docs = [d async for d in query.stream()]
    if not docs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No weekly recommendations available yet. Trigger generation to create them."
        )
        
    return docs[0].to_dict()

@router.post("/generate", response_model=WeeklyRecommendations)
async def generate_insights(
    current_user_claims: Dict[str, str] = Depends(get_current_user),
    user_repo: UserRepository = Depends(UserRepository),
    action_repo: ActionRepository = Depends(ActionRepository),
    vertex_client: VertexAIClient = Depends(get_vertex_client)
) -> WeeklyRecommendations:
    uid = current_user_claims["uid"]
    
    # 1. Fetch user to retrieve baseline info
    user = await user_repo.get_user(uid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Complete onboarding first."
        )
        
    # 2. Fetch logged actions for the past 7 days
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
    recent_logs: List[Dict[str, Any]] = []
    
    logs_query = action_repo.logs_ref.where("userId", "==", uid).where("date", ">=", seven_days_ago).stream()
    async for doc in logs_query:
        data = doc.to_dict()
        if data:
            recent_logs.append(data)
            
    # 3. Call Vertex AI (Gemini) with baseline and log trends
    baseline_info = {
        "carbonBaseline": user.carbonBaseline.model_dump()
    }
    
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
        "recommendations": [r.model_dump() for r in recommendations_result.recommendations],
        "createdAt": datetime.utcnow()
    }
    
    await user_repo.insights_ref.document(insight_id).set(insight_doc)
    
    return recommendations_result
