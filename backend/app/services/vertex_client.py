import json
from typing import List, Dict, Any
from pydantic import BaseModel, Field
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from app.core.config import settings

# Recommendation Schema Definition — aligned with frontend API contract
class RecommendationItem(BaseModel):
    title: str = Field(..., description="Short, action-oriented title.")
    description: str = Field(..., description="Why it matters, tied directly to the user's highest emission source.")
    estimatedCO2Reduction: float = Field(..., description="Estimated CO2 reduction in kg/month.")
    estimatedCostImpact: str = Field(default="", description="Estimated cost savings or expense.")
    impact: str = Field(..., description="Impact level: 'high' | 'medium' | 'low'.")
    difficulty: str = Field(..., description="Difficulty level: 'easy' | 'moderate' | 'hard'.")
    timeframe: str = Field(default="short-term", description="Expected timeframe.")

class WeeklyRecommendations(BaseModel):
    recommendations: List[RecommendationItem] = Field(..., min_length=2, max_length=3)


class VertexAIClient:
    def __init__(self) -> None:
        self.project_id = settings.PROJECT_ID
        self.location = settings.VERTEX_AI_LOCATION
        self.initialized = False

    def _initialize_vertex(self) -> None:
        if not self.initialized:
            try:
                vertexai.init(project=self.project_id, location=self.location)
                self.initialized = True
            except Exception:
                # Silently fail initialization in development to fall back to mock
                if settings.ENVIRONMENT == "production":
                    raise

    async def generate_weekly_recommendations(
        self, user_baseline: Dict[str, Any], recent_logs: List[Dict[str, Any]]
    ) -> WeeklyRecommendations:
        """
        Uses Vertex AI (Gemini) with structured JSON schema outputs to deliver
        highly personalized carbon reduction recommendations based on baseline and logs.
        """
        # If in development or not initialized, return high-quality mock recommendations
        if settings.ENVIRONMENT == "development":
            return self._generate_mock_recommendations(user_baseline, recent_logs)

        self._initialize_vertex()

        try:
            # Setup Vertex AI Gemini Model
            model = GenerativeModel("gemini-2.0-flash")

            # Formulate the prompt
            prompt = f"""Analyze this user's current carbon baseline and recent weekly actions to generate 2 to 3 tailored recommendations.

User Carbon Baseline (kg CO2/month):
{json.dumps(user_baseline)}

User's Logged Carbon Reduction Actions this Week:
{json.dumps(recent_logs)}

CRITICAL: Do NOT recommend actions that the user has already logged in their recent weekly actions. Suggest completely NEW habits.
Return recommendations that target their highest emission categories. Ensure they are safe, actionable, and specific."""

            # Enforce structured output via Pydantic model response schema
            response_schema = {
                "type": "OBJECT",
                "properties": {
                    "recommendations": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "title": {"type": "STRING", "description": "Short, action-oriented title."},
                                "description": {"type": "STRING", "description": "Why it matters, tied directly to the user's highest emission source."},
                                "estimatedCO2Reduction": {"type": "NUMBER"},
                                "estimatedCostImpact": {"type": "STRING"},
                                "impact": {"type": "STRING", "description": "Impact level: 'high' | 'medium' | 'low'."},
                                "difficulty": {"type": "STRING", "description": "Difficulty level: 'easy' | 'moderate' | 'hard'."},
                                "timeframe": {"type": "STRING"},
                            },
                            "required": ["title", "description", "estimatedCO2Reduction", "estimatedCostImpact", "impact", "difficulty", "timeframe"],
                        }
                    }
                },
                "required": ["recommendations"]
            }

            response = model.generate_content(
                prompt,
                generation_config=GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=response_schema,
                    temperature=0.2
                )
            )

            data = json.loads(response.text)
            return WeeklyRecommendations(**data)

        except Exception as e:
            # Fail-safe grace fallback to mock generator
            if settings.ENVIRONMENT == "production":
                # Log error or alert in production, but still return mock data to prevent user-facing crash
                print(f"Vertex AI failed: {str(e)}")
            return self._generate_mock_recommendations(user_baseline, recent_logs)

    def _generate_mock_recommendations(
        self, user_baseline: Dict[str, Any], recent_logs: List[Dict[str, Any]]
    ) -> WeeklyRecommendations:
        # Determine highest emission source
        baseline = user_baseline.get("carbonBaseline", {})
        transport = baseline.get("transport", 0.0)
        energy = baseline.get("energy", 0.0)
        diet = baseline.get("diet", 0.0)

        recommendations = []

        if transport >= energy and transport >= diet:
            recommendations.append(
                RecommendationItem(
                    title="Switch to public transit or carpooling twice a week",
                    description=f"Transportation is your largest emission source at {transport:.1f} kg CO₂e/day. Shared transport can cut this by up to 40%.",
                    estimatedCO2Reduction=24.5,
                    estimatedCostImpact="~₹1,200/month savings",
                    impact="high",
                    difficulty="easy",
                    timeframe="immediate"
                )
            )
            recommendations.append(
                RecommendationItem(
                    title="Use a bicycle for trips under 3 km",
                    description="Replacing short car trips eliminates cold-start engine inefficiency and saves fuel costs.",
                    estimatedCO2Reduction=12.0,
                    estimatedCostImpact="~₹500/month savings",
                    impact="medium",
                    difficulty="moderate",
                    timeframe="short-term"
                )
            )
        elif energy >= transport and energy >= diet:
            recommendations.append(
                RecommendationItem(
                    title="Enable eco-mode on your smart thermostat",
                    description=f"Home energy is your top category at {energy:.1f} kg CO₂e/day. A thermostat schedule can reduce HVAC load by 15–20%.",
                    estimatedCO2Reduction=30.0,
                    estimatedCostImpact="~₹800/month savings",
                    impact="high",
                    difficulty="easy",
                    timeframe="immediate"
                )
            )
            recommendations.append(
                RecommendationItem(
                    title="Replace bulbs with LED in high-use rooms",
                    description="LED bulbs use up to 80% less energy than incandescent equivalents and last 25× longer.",
                    estimatedCO2Reduction=8.5,
                    estimatedCostImpact="~₹150/month savings",
                    impact="low",
                    difficulty="easy",
                    timeframe="short-term"
                )
            )
        else:
            recommendations.append(
                RecommendationItem(
                    title="Adopt three plant-based meals per week",
                    description=f"Diet is your highest emission category at {diet:.1f} kg CO₂e/day. Swapping animal proteins trims this significantly.",
                    estimatedCO2Reduction=18.0,
                    estimatedCostImpact="~₹400/month savings",
                    impact="high",
                    difficulty="moderate",
                    timeframe="immediate"
                )
            )
            recommendations.append(
                RecommendationItem(
                    title="Reduce dairy intake by 50%",
                    description="Dairy production has high methane emission factors. Substituting with oat or soy milk halves this footprint.",
                    estimatedCO2Reduction=10.2,
                    estimatedCostImpact="~₹300/month savings",
                    impact="medium",
                    difficulty="easy",
                    timeframe="immediate"
                )
            )

        # Always return at least 2 recommendations
        return WeeklyRecommendations(recommendations=recommendations[:2])
