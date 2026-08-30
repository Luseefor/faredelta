from abc import ABC, abstractmethod

from app.core.exceptions import FlightProviderError
from app.schemas.flights import FlightOffer, FlightSearchRequest


class FlightProvider(ABC):
    @abstractmethod
    async def search_flights(self, request: FlightSearchRequest) -> list[FlightOffer]:
        """Return offers normalized to FareDelta's internal schema."""

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the stable display name for this provider."""


class UnavailableFlightProvider(FlightProvider):
    def __init__(self, provider_name: str, reason: str) -> None:
        self.provider_name = provider_name
        self.reason = reason

    async def search_flights(self, request: FlightSearchRequest) -> list[FlightOffer]:
        raise FlightProviderError(self.reason)

    def get_provider_name(self) -> str:
        return self.provider_name
