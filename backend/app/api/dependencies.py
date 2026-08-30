from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_session
from app.providers.amadeus import AmadeusFlightProvider
from app.providers.base import FlightProvider, UnavailableFlightProvider
from app.providers.mock import MockFlightProvider
from app.repositories.fare_history import FareHistoryRepository
from app.repositories.flight_searches import FlightSearchRepository
from app.repositories.tracked_routes import TrackedRouteRepository
from app.services.fare_history import FareHistoryService
from app.services.flight_search import FlightSearchService
from app.services.tracked_route_refresh import TrackedRouteRefreshService
from app.services.tracked_routes import TrackedRouteService


@lru_cache
def get_flight_provider() -> FlightProvider:
    settings = get_settings()
    if settings.flight_provider == "mock":
        return MockFlightProvider()
    if not settings.amadeus_client_id or settings.amadeus_client_secret is None:
        return UnavailableFlightProvider(
            "Amadeus Self-Service", "Amadeus credentials are not configured"
        )
    return AmadeusFlightProvider(
        client_id=settings.amadeus_client_id,
        client_secret=settings.amadeus_client_secret.get_secret_value(),
        base_url=settings.amadeus_base_url,
    )


SessionDependency = Annotated[AsyncSession, Depends(get_session)]
ProviderDependency = Annotated[FlightProvider, Depends(get_flight_provider)]


def get_flight_search_service(
    session: SessionDependency, provider: ProviderDependency
) -> FlightSearchService:
    return FlightSearchService(provider, FlightSearchRepository(session))


FlightSearchServiceDependency = Annotated[FlightSearchService, Depends(get_flight_search_service)]


def get_fare_history_service(session: SessionDependency) -> FareHistoryService:
    return FareHistoryService(FareHistoryRepository(session))


FareHistoryServiceDependency = Annotated[FareHistoryService, Depends(get_fare_history_service)]


def get_tracked_route_service(session: SessionDependency) -> TrackedRouteService:
    return TrackedRouteService(TrackedRouteRepository(session))


TrackedRouteServiceDependency = Annotated[TrackedRouteService, Depends(get_tracked_route_service)]


def get_tracked_route_refresh_service(
    session: SessionDependency, provider: ProviderDependency
) -> TrackedRouteRefreshService:
    return TrackedRouteRefreshService(
        provider, TrackedRouteRepository(session), FlightSearchRepository(session)
    )


TrackedRouteRefreshServiceDependency = Annotated[
    TrackedRouteRefreshService, Depends(get_tracked_route_refresh_service)
]
