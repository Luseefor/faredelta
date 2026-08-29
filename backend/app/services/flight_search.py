from datetime import UTC, datetime

from app.providers.base import FlightProvider
from app.repositories.flight_searches import FlightSearchRepository
from app.schemas.flights import FlightSearchRequest, FlightSearchResponse


class FlightSearchService:
    def __init__(self, provider: FlightProvider, repository: FlightSearchRepository) -> None:
        self.provider = provider
        self.repository = repository

    async def search(self, request: FlightSearchRequest) -> FlightSearchResponse:
        offers = await self.provider.search_flights(request)
        offers = [offer for offer in offers if offer.stops <= request.maximum_stops]
        search_id = await self.repository.save_search_with_offers(request, offers)
        retrieved_at = max((offer.retrieved_at for offer in offers), default=datetime.now(UTC))
        return FlightSearchResponse(
            search_id=search_id,
            providers=[self.provider.get_provider_name()],
            result_count=len(offers),
            retrieved_at=retrieved_at,
            offers=offers,
        )
