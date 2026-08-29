from abc import ABC, abstractmethod

from app.schemas.flights import FlightOffer, FlightSearchRequest


class FlightProvider(ABC):
    @abstractmethod
    async def search_flights(self, request: FlightSearchRequest) -> list[FlightOffer]:
        """Return offers normalized to FareDelta's internal schema."""

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the stable display name for this provider."""
