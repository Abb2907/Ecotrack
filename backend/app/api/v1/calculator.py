"""Carbon emissions calculator API routes.

Provides endpoints for calculating CO2 emissions across transport,
home energy, and dietary categories using pluggable emission factor clients.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.services.emission_client import BaseEmissionClient, get_emission_client

router = APIRouter(prefix="/calculator", tags=["Emissions Calculator"])


class TransportCalcRequest(BaseModel):
    """Request schema for transport emission calculations."""
    distance_km: float = Field(..., gt=0, description="Distance traveled in kilometers")
    mode: str = Field(
        ..., description="gasoline_car | diesel_car | electric_car | bus | train"
    )


class EnergyCalcRequest(BaseModel):
    """Request schema for home energy emission calculations."""
    kwh: float = Field(..., gt=0, description="Energy usage in kilowatt-hours (kWh)")
    source: str = Field(..., description="grid_electricity | natural_gas | heating_oil")


class DietCalcRequest(BaseModel):
    """Request schema for dietary emission calculations."""
    meals: int = Field(..., gt=0, description="Number of meals eaten")
    diet_type: str = Field(..., description="meat_heavy | vegetarian | vegan")


class CalcResponse(BaseModel):
    """Standard response containing the calculated CO2 in kilograms."""
    co2_kg: float


@router.post("/transport", response_model=CalcResponse)
async def calculate_transport(
    payload: TransportCalcRequest,
    current_user: dict = Depends(get_current_user),
    emission_client: BaseEmissionClient = Depends(get_emission_client),
) -> CalcResponse:
    """Calculate CO2 emissions for a transport journey.

    Args:
        payload: Distance and transport mode details.
        current_user: Authenticated user claims.
        emission_client: Injected emission factor client.

    Returns:
        Calculated CO2 emissions in kilograms.
    """
    co2 = await emission_client.calculate_transport_emissions(
        payload.distance_km, payload.mode
    )
    return CalcResponse(co2_kg=co2)


@router.post("/energy", response_model=CalcResponse)
async def calculate_energy(
    payload: EnergyCalcRequest,
    current_user: dict = Depends(get_current_user),
    emission_client: BaseEmissionClient = Depends(get_emission_client),
) -> CalcResponse:
    """Calculate CO2 emissions for home energy usage.

    Args:
        payload: Energy usage (kWh) and source details.
        current_user: Authenticated user claims.
        emission_client: Injected emission factor client.

    Returns:
        Calculated CO2 emissions in kilograms.
    """
    co2 = await emission_client.calculate_energy_emissions(payload.kwh, payload.source)
    return CalcResponse(co2_kg=co2)


@router.post("/diet", response_model=CalcResponse)
async def calculate_diet(
    payload: DietCalcRequest,
    current_user: dict = Depends(get_current_user),
    emission_client: BaseEmissionClient = Depends(get_emission_client),
) -> CalcResponse:
    """Calculate CO2 emissions for dietary consumption.

    Args:
        payload: Number of meals and diet type.
        current_user: Authenticated user claims.
        emission_client: Injected emission factor client.

    Returns:
        Calculated CO2 emissions in kilograms.
    """
    co2 = await emission_client.calculate_diet_emissions(
        payload.meals, payload.diet_type
    )
    return CalcResponse(co2_kg=co2)
