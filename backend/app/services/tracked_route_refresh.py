import asyncio
import logging
import uuid
from datetime import UTC, datetime

from app.models.entities import TrackedRoute
from app.providers.base import FlightProvider
from app.repositories.alerts import NotificationRepository, PriceAlertRepository
from app.repositories.flight_searches import FlightSearchRepository
from app.repositories.tracked_routes import TrackedRouteRepository
from app.repositories.users import UserRepository
from app.schemas.flights import FlightOffer, FlightSearchRequest
from app.schemas.tracked_routes import TrackedRouteRefreshSummary, TrackedRouteResponse
from app.services.alerts import AlertService

logger = logging.getLogger(__name__)

REFRESH_CONCURRENCY = 5
REFRESH_BATCH_LIMIT = 500


class TrackedRouteRefreshService:
    def __init__(
        self,
        provider: FlightProvider,
        tracked_routes: TrackedRouteRepository,
        searches: FlightSearchRepository,
        alerts: PriceAlertRepository,
        notifications: NotificationRepository,
        users: UserRepository,
    ) -> None:
        self.provider = provider
        self.tracked_routes = tracked_routes
        self.searches = searches
        self.users = users
        self.alert_service = AlertService(alerts, notifications, tracked_routes)

    async def refresh_for_owner(
        self,
        route_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
        anonymous_id: uuid.UUID | None = None,
    ) -> TrackedRouteResponse | None:
        route = await self.tracked_routes.get_for_owner(
            route_id, user_id=user_id, anonymous_id=anonymous_id
        )
        if route is None:
            return None
        offers = await self._search_offers(route)
        await self._persist(route, offers)
        return TrackedRouteResponse.model_validate(route, from_attributes=True)

    async def refresh_all(self, limit: int = REFRESH_BATCH_LIMIT) -> TrackedRouteRefreshSummary:
        """Refresh routes due for a check.

        Intended for an external cron (e.g. hourly): only due routes run. Provider
        searches fan out concurrently, while all database writes stay sequential
        on the request session (AsyncSession is not safe for concurrent use).
        Failures back off exponentially, and one bad route never blocks the batch.
        """
        due = await self.tracked_routes.list_due_for_refresh(datetime.now(UTC), limit)
        semaphore = asyncio.Semaphore(REFRESH_CONCURRENCY)
        searches = await asyncio.gather(
            *(self._search_guarded(route, semaphore) for route in due)
        )
        refreshed = 0
        failed = 0
        for route, outcome in zip(due, searches, strict=True):
            if isinstance(outcome, Exception):
                logger.warning(
                    "Scheduled refresh failed for route %s", route.id, exc_info=outcome
                )
                await self._record_failure_quietly(route)
                failed += 1
                continue
            try:
                await self._persist(route, outcome)
                refreshed += 1
            except Exception:
                logger.warning("Scheduled refresh failed for route %s", route.id, exc_info=True)
                await self._record_failure_quietly(route)
                failed += 1
        return TrackedRouteRefreshSummary(refreshed=refreshed, failed=failed)

    async def _search_guarded(
        self, route: TrackedRoute, semaphore: asyncio.Semaphore
    ) -> list[FlightOffer] | Exception:
        async with semaphore:
            try:
                return await self._search_offers(route)
            except Exception as exc:
                return exc

    async def _search_offers(self, route: TrackedRoute) -> list[FlightOffer]:
        request = FlightSearchRequest.model_validate(route, from_attributes=True)
        offers: list[FlightOffer] = []
        for pair in request.expanded_requests():
            pair_offers = await self.provider.search_flights(pair)
            offers.extend(
                offer for offer in pair_offers if offer.stops <= request.maximum_stops
            )
        return offers

    async def _persist(self, route: TrackedRoute, offers: list[FlightOffer]) -> TrackedRoute:
        request = FlightSearchRequest.model_validate(route, from_attributes=True)
        await self.searches.save_search_with_offers(request, offers)
        if offers:
            cheapest = min(offers, key=lambda offer: offer.price)
            route = await self.tracked_routes.update_price(
                route, cheapest.price, cheapest.currency, datetime.now(UTC)
            )
            await self._evaluate_alerts(route)
        await self.tracked_routes.record_refresh_success(route, datetime.now(UTC))
        return route

    async def _record_failure_quietly(self, route: TrackedRoute) -> None:
        try:
            await self.tracked_routes.record_refresh_failure(route, datetime.now(UTC))
        except Exception:
            logger.warning(
                "Could not record refresh failure for route %s", route.id, exc_info=True
            )

    async def _evaluate_alerts(self, route: TrackedRoute) -> None:
        # Alerts must never break a refresh: any failure resolves to skipped.
        try:
            user = await self.users.get_by_id(route.user_id) if route.user_id else None
            await self.alert_service.evaluate_route(route, user)
        except Exception:
            logger.warning("Alert evaluation skipped for route %s", route.id, exc_info=True)
