from datetime import UTC, datetime

from app.providers.base import FlightProvider
from app.providers.mock import PROVIDER_NAME as MOCK_PROVIDER_NAME
from app.repositories.flight_searches import FlightSearchRepository
from app.schemas.flights import AirportPair, FlightOffer, FlightSearchRequest, FlightSearchResponse


class FlightSearchService:
    def __init__(
        self,
        provider: FlightProvider,
        repository: FlightSearchRepository,
        sample_data_notice: str | None = None,
    ) -> None:
        self.provider = provider
        self.repository = repository
        self.sample_data_notice = sample_data_notice

    async def search(self, request: FlightSearchRequest) -> FlightSearchResponse:
        pairs = request.expanded_requests()
        offers: list[FlightOffer] = []
        for pair in pairs:
            pair_offers = await self.provider.search_flights(pair)
            offers.extend(
                offer for offer in pair_offers if offer.stops <= request.maximum_stops
            )
        search_id = await self.repository.save_search_with_offers(request, offers)
        retrieved_at = max((offer.retrieved_at for offer in offers), default=datetime.now(UTC))
        providers = list(dict.fromkeys(offer.provider for offer in offers)) or [
            self.provider.get_provider_name()
        ]
        notice = (
            self.sample_data_notice
            if self.sample_data_notice is not None
            and offers
            and all(offer.provider == MOCK_PROVIDER_NAME for offer in offers)
            else None
        )
        return FlightSearchResponse(
            search_id=search_id,
            providers=providers,
            result_count=len(offers),
            retrieved_at=retrieved_at,
            trip_type=request.trip_type,
            airport_pairs=[
                AirportPair(origin=pair.origin, destination=pair.destination) for pair in pairs
            ],
            notice=notice,
            offers=offers,
        )
