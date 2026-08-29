import uuid

from app.providers.mock import MockFlightProvider
from app.schemas.flights import FlightOffer, FlightSearchRequest
from app.services.flight_search import FlightSearchService
from tests.test_schemas import valid_request


class MemoryRepository:
    request: FlightSearchRequest | None = None
    offers: list[FlightOffer] = []

    async def save_search_with_offers(
        self, request: FlightSearchRequest, offers: list[FlightOffer]
    ) -> uuid.UUID:
        self.request = request
        self.offers = offers
        return uuid.UUID("8edc2846-0f62-4fd1-a315-c10fc356957e")


async def test_service_returns_and_persists_normalized_response() -> None:
    repository = MemoryRepository()
    service = FlightSearchService(MockFlightProvider(), repository)  # type: ignore[arg-type]
    response = await service.search(valid_request())

    assert response.result_count == 9
    assert response.providers == ["FareDelta Mock"]
    assert repository.request is not None
    assert len(repository.offers) == response.result_count
