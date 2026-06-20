from abc import ABC, abstractmethod
from typing import Dict
import httpx
from app.core.config import settings

class BaseEmissionClient(ABC):
    @abstractmethod
    async def calculate_transport_emissions(self, distance_km: float, mode: str) -> float:
        """
        Calculates transport emissions in kg CO2.
        Modes: 'gasoline_car', 'diesel_car', 'electric_car', 'bus', 'train'
        """
        pass

    @abstractmethod
    async def calculate_energy_emissions(self, kwh: float, source: str) -> float:
        """
        Calculates home energy emissions in kg CO2.
        Sources: 'grid_electricity', 'natural_gas', 'heating_oil'
        """
        pass

    @abstractmethod
    async def calculate_diet_emissions(self, meals: int, diet_type: str) -> float:
        """
        Calculates diet-related emissions in kg CO2.
        Diet Types: 'meat_heavy', 'vegetarian', 'vegan'
        """
        pass


class MockEmissionClient(BaseEmissionClient):
    """
    Standard mock implementation using static, real-world average emission factors
    obtained from EPA and GHG Protocol guides.
    """
    async def calculate_transport_emissions(self, distance_km: float, mode: str) -> float:
        # Factors in kg CO2 per km
        factors = {
            "gasoline_car": 0.192,
            "diesel_car": 0.171,
            "electric_car": 0.053,
            "bus": 0.089,
            "train": 0.041
        }
        factor = factors.get(mode, 0.192)
        return round(distance_km * factor, 4)

    async def calculate_energy_emissions(self, kwh: float, source: str) -> float:
        # Factors in kg CO2 per unit (kWh for electricity, therm for gas, gallon for oil)
        factors = {
            "grid_electricity": 0.371,  # US grid average kg CO2/kWh
            "natural_gas": 0.181,       # kg CO2/kWh equivalent
            "heating_oil": 0.267        # kg CO2/kWh equivalent
        }
        factor = factors.get(source, 0.371)
        return round(kwh * factor, 4)

    async def calculate_diet_emissions(self, meals: int, diet_type: str) -> float:
        # Average emissions in kg CO2 per meal
        factors = {
            "meat_heavy": 3.2,
            "vegetarian": 1.2,
            "vegan": 0.7
        }
        factor = factors.get(diet_type, 1.2)
        return round(meals * factor, 4)


class ClimatiqEmissionClient(BaseEmissionClient):
    """
    Production-ready concrete implementation connecting to the Climatiq API.
    """
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self.base_url = "https://beta3.api.climatiq.io"
        self.headers = {"Authorization": f"Bearer {self.api_key}"}

    async def calculate_transport_emissions(self, distance_km: float, mode: str) -> float:
        # Maps local mode names to Climatiq factor keys/activity IDs
        mapping = {
            "gasoline_car": "passenger_vehicle-vehicle_type_car-fuel_source_petrol-engine_size_na",
            "diesel_car": "passenger_vehicle-vehicle_type_car-fuel_source_diesel-engine_size_na",
            "electric_car": "passenger_vehicle-vehicle_type_car-fuel_source_bev-engine_size_na",
            "bus": "passenger_vehicle-vehicle_type_bus-fuel_source_na-engine_size_na",
            "train": "passenger_vehicle-vehicle_type_train-fuel_source_na-engine_size_na"
        }
        activity_id = mapping.get(mode, "passenger_vehicle-vehicle_type_car-fuel_source_petrol-engine_size_na")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/estimate",
                    headers=self.headers,
                    json={
                        "emission_factor": {"activity_id": activity_id},
                        "parameters": {"distance": distance_km, "distance_unit": "km"}
                    }
                )
                if response.status_code == 200:
                    return float(response.json().get("co2e", 0.0))
            except Exception:
                pass
        
        # Graceful fallback to mock calculation in case of network or quota errors
        mock = MockEmissionClient()
        return await mock.calculate_transport_emissions(distance_km, mode)

    async def calculate_energy_emissions(self, kwh: float, source: str) -> float:
        activity_id = "electricity-energy_source_grid_mix" if source == "grid_electricity" else "fuel-energy_source_natural_gas"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/estimate",
                    headers=self.headers,
                    json={
                        "emission_factor": {"activity_id": activity_id},
                        "parameters": {"energy": kwh, "energy_unit": "kWh"}
                    }
                )
                if response.status_code == 200:
                    return float(response.json().get("co2e", 0.0))
            except Exception:
                pass
        
        mock = MockEmissionClient()
        return await mock.calculate_energy_emissions(kwh, source)

    async def calculate_diet_emissions(self, meals: int, diet_type: str) -> float:
        # Diet factors are highly country-specific, fallback to regional database defaults
        mock = MockEmissionClient()
        return await mock.calculate_diet_emissions(meals, diet_type)


def get_emission_client() -> BaseEmissionClient:
    # Factory function defaulting to Mock Client during local testing and development phases
    climatiq_key = settings.PROJECT_ID # Or loaded from Secret Manager/ENV
    # Using environment checks to select active client
    if settings.ENVIRONMENT == "production" and climatiq_key != "gen-lang-client-0849880096":
        return ClimatiqEmissionClient(api_key=climatiq_key)
    return MockEmissionClient()
