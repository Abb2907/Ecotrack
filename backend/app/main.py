from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.repositories.action_repository import ActionRepository
from app.api.v1.auth import router as auth_router
from app.api.v1.calculator import router as calculator_router
from app.api.v1.actions import router as actions_router
from app.api.v1.insights import router as insights_router
from app.api.v1.privacy import router as privacy_router

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seeding database with default catalog actions.
    # Skip seeding in development/testing mode to prevent hangs during offline test suites.
    if settings.ENVIRONMENT != "development":
        action_repo = ActionRepository()
        try:
            await action_repo.seed_default_actions()
        except Exception as e:
            # Gracefully handle seeding failures if Firestore credentials are not loaded yet
            print(f"Skipping startup DB seeding: {str(e)}")
    yield

app = FastAPI(
    title="EcoTrack API",
    description="Secure, accessible, and performant backend service for carbon footprint tracking and reduction analytics.",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# Configure CORS middleware
# Adjust origins in production deployment
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register endpoints routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(calculator_router, prefix="/api/v1")
app.include_router(actions_router, prefix="/api/v1")
app.include_router(insights_router, prefix="/api/v1")
app.include_router(privacy_router, prefix="/api/v1")

@app.get("/health", tags=["Health Check"])
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "environment": settings.ENVIRONMENT}
