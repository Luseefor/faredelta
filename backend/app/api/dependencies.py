from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.providers.base import FlightProvider
from app.providers.mock import MockFlightProvider
from app.repositories.fare_history import FareHistoryRepository
from app.repositories.flight_searches import FlightSearchRepository
from app.services.fare_history import FareHistoryService
from app.services.flight_search import FlightSearchService


def get_flight_provider() -> FlightProvider:
    return MockFlightProvider()


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
