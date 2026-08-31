from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.providers.base import FallbackFlightProvider, FlightProvider, UnavailableFlightProvider
from app.providers.duffel import DuffelFlightProvider
from app.providers.mock import MockFlightProvider
from app.providers.travelpayouts import TravelpayoutsFlightProvider
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
    if settings.flight_provider == "duffel":
        if settings.duffel_access_token is None:
            return UnavailableFlightProvider("Duffel", "Duffel access token is not configured")
        return _duffel_provider(settings)
    if settings.flight_provider == "travelpayouts":
        if settings.travelpayouts_access_token is None:
            return UnavailableFlightProvider(
                "Travelpayouts", "Travelpayouts access token is not configured"
            )
        return _travelpayouts_provider(settings)

    fallback: FlightProvider = (
        MockFlightProvider()
        if settings.mock_provider_enabled
        else UnavailableFlightProvider("FareDelta", "No flight provider is configured")
    )
    if settings.duffel_access_token is not None:
        fallback = FallbackFlightProvider(_duffel_provider(settings), fallback)
    if settings.travelpayouts_access_token is not None:
        fallback = FallbackFlightProvider(_travelpayouts_provider(settings), fallback)
    return fallback


def _duffel_provider(settings: Settings) -> FlightProvider:
    assert settings.duffel_access_token is not None
    return DuffelFlightProvider(
        access_token=settings.duffel_access_token.get_secret_value(),
        base_url=settings.duffel_base_url,
    )


def _travelpayouts_provider(settings: Settings) -> FlightProvider:
    assert settings.travelpayouts_access_token is not None
    return TravelpayoutsFlightProvider(
        access_token=settings.travelpayouts_access_token.get_secret_value(),
        base_url=settings.travelpayouts_base_url,
        market=settings.travelpayouts_market,
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
