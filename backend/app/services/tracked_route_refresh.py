import uuid
from datetime import UTC, datetime

from app.models.entities import TrackedRoute
from app.providers.base import FlightProvider
from app.repositories.flight_searches import FlightSearchRepository
from app.repositories.tracked_routes import TrackedRouteRepository
from app.schemas.flights import FlightSearchRequest
from app.schemas.tracked_routes import TrackedRouteRefreshSummary, TrackedRouteResponse


class TrackedRouteRefreshService:
    def __init__(
        self,
        provider: FlightProvider,
        tracked_routes: TrackedRouteRepository,
        searches: FlightSearchRepository,
    ) -> None:
        self.provider = provider
        self.tracked_routes = tracked_routes
        self.searches = searches

    async def refresh_for_owner(
        self, route_id: uuid.UUID, anonymous_id: uuid.UUID
    ) -> TrackedRouteResponse | None:
        route = await self.tracked_routes.get_for_owner(route_id, anonymous_id)
        if route is None:
            return None
        return await self._refresh(route)

    async def refresh_all(self) -> TrackedRouteRefreshSummary:
        refreshed = 0
        failed = 0
        for route in await self.tracked_routes.list_active():
            try:
                await self._refresh(route)
                refreshed += 1
            except Exception:
                failed += 1
        return TrackedRouteRefreshSummary(refreshed=refreshed, failed=failed)

    async def _refresh(self, route: TrackedRoute) -> TrackedRouteResponse:
        request = FlightSearchRequest.model_validate(route, from_attributes=True)
        offers = await self.provider.search_flights(request)
        offers = [offer for offer in offers if offer.stops <= request.maximum_stops]
        await self.searches.save_search_with_offers(request, offers)
        if offers:
            cheapest = min(offers, key=lambda offer: offer.price)
            route = await self.tracked_routes.update_price(
                route, cheapest.price, cheapest.currency, datetime.now(UTC)
            )
        return TrackedRouteResponse.model_validate(route, from_attributes=True)
