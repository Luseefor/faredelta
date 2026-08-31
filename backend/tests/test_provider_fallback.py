from app.core.exceptions import FlightProviderError
from app.providers.base import FallbackFlightProvider, FlightProvider
from app.providers.mock import MockFlightProvider
from app.schemas.flights import FlightOffer, FlightSearchRequest
from tests.test_schemas import valid_request


class FailedProvider(FlightProvider):
    async def search_flights(self, request: FlightSearchRequest) -> list[FlightOffer]:
        raise FlightProviderError("temporary provider failure")

    def get_provider_name(self) -> str:
        return "Failed source"


class EmptyProvider(FailedProvider):
    async def search_flights(self, request: FlightSearchRequest) -> list[FlightOffer]:
        return []


async def test_fallback_provider_recovers_from_provider_failure() -> None:
    provider = FallbackFlightProvider(FailedProvider(), MockFlightProvider())
    offers = await provider.search_flights(valid_request())

    assert offers
    assert {offer.provider for offer in offers} == {"FareDelta Mock"}


async def test_fallback_provider_recovers_from_empty_coverage() -> None:
    provider = FallbackFlightProvider(EmptyProvider(), MockFlightProvider())
    offers = await provider.search_flights(valid_request())

    assert offers
    assert {offer.provider for offer in offers} == {"FareDelta Mock"}
