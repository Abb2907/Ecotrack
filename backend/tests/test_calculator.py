"""Tests for the carbon emissions calculator API and mock emission client."""

import pytest
from fastapi.testclient import TestClient

from app.services.emission_client import MockEmissionClient


@pytest.mark.asyncio
async def test_mock_emission_calculations() -> None:
    client = MockEmissionClient()

    # 1. Transport tests (gasoline_car: 0.192, electric_car: 0.053)
    co2_gas = await client.calculate_transport_emissions(100.0, "gasoline_car")
    assert co2_gas == 19.2

    co2_elec = await client.calculate_transport_emissions(100.0, "electric_car")
    assert co2_elec == 5.3

    # 2. Energy tests (grid_electricity: 0.371, natural_gas: 0.181)
    co2_grid = await client.calculate_energy_emissions(200.0, "grid_electricity")
    assert co2_grid == 74.2

    co2_gas_heating = await client.calculate_energy_emissions(150.0, "natural_gas")
    assert co2_gas_heating == 27.15

    # 3. Diet tests (meat_heavy: 3.2, vegan: 0.7)
    co2_meat = await client.calculate_diet_emissions(10, "meat_heavy")
    assert co2_meat == 32.0

    co2_vegan = await client.calculate_diet_emissions(5, "vegan")
    assert co2_vegan == 3.5


def test_calculator_api_endpoints(client: TestClient) -> None:
    # 1. Test transport calculation endpoint
    response = client.post(
        "/api/v1/calculator/transport",
        json={"distance_km": 50.0, "mode": "gasoline_car"},
    )
    assert response.status_code == 200
    assert response.json() == {"co2_kg": 9.6}

    # 2. Test energy calculation endpoint
    response = client.post(
        "/api/v1/calculator/energy", json={"kwh": 100.0, "source": "grid_electricity"}
    )
    assert response.status_code == 200
    assert response.json() == {"co2_kg": 37.1}

    # 3. Test diet calculation endpoint
    response = client.post(
        "/api/v1/calculator/diet", json={"meals": 3, "diet_type": "vegan"}
    )
    assert response.status_code == 200
    assert response.json() == {"co2_kg": 2.1}


def test_calculator_api_invalid_inputs(client: TestClient) -> None:
    # Negative values must be rejected by Pydantic validation (greater than 0 check)
    response = client.post(
        "/api/v1/calculator/transport",
        json={"distance_km": -10.0, "mode": "gasoline_car"},
    )
    assert response.status_code == 422

    response = client.post(
        "/api/v1/calculator/energy", json={"kwh": -100.0, "source": "grid_electricity"}
    )
    assert response.status_code == 422
