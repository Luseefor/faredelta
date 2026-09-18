import logging
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import (
    ExploreServiceDependency,
    FareHistoryServiceDependency,
    FlightSearchServiceDependency,
)
from app.core.exceptions import FlightProviderError
from app.schemas.explore import CheapDestinationsQuery, CheapDestinationsResponse
from app.schemas.flights import FareHistoryResponse, FlightSearchRequest, FlightSearchResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/flights", tags=["flights"])


@router.get("/history", response_model=FareHistoryResponse)
async def get_fare_history(
    service: FareHistoryServiceDependency,
    origin: str = Query(pattern=r"^[A-Za-z]{3}$"),
    destination: str = Query(pattern=r"^[A-Za-z]{3}$"),
    departure_date: date | None = None,
    return_date: date | None = None,
) -> FareHistoryResponse:
    normalized_origin = origin.upper()
    normalized_destination = destination.upper()
    if normalized_origin == normalized_destination:
        raise HTTPException(status_code=422, detail="Origin and destination must be different.")
    try:
        return await service.get_history(
            normalized_origin,
            normalized_destination,
            departure_date,
            return_date,
        )
    except SQLAlchemyError as exc:
        logger.exception("Could not load fare history")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Fare history is temporarily unavailable.",
        ) from exc


@router.post("/search", response_model=FlightSearchResponse)
async def search_flights(
    request: FlightSearchRequest, service: FlightSearchServiceDependency
) -> FlightSearchResponse:
    try:
        return await service.search(request)
    except FlightProviderError as exc:
        logger.warning("Flight provider search failed", exc_info=exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Flight data is temporarily unavailable.",
        ) from exc
    except SQLAlchemyError as exc:
        logger.exception("Could not persist flight search")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The search could not be saved. Please try again.",
        ) from exc


@router.get("/cheap-destinations", response_model=CheapDestinationsResponse)
async def get_cheap_destinations(
    service: ExploreServiceDependency,
    origin: str = Query(pattern=r"^[A-Za-z]{3}$"),
    depart_date: date | None = None,
    return_date: date | None = None,
    currency: str = Query(default="USD", pattern=r"^[A-Za-z]{3}$"),
    limit: int = Query(default=20, ge=1, le=50),
) -> CheapDestinationsResponse:
    query = CheapDestinationsQuery(
        origin=origin.upper(),
        depart_date=depart_date,
        return_date=return_date,
        currency=currency,
        limit=limit,
    )
    if not service.configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cheap fares are not configured.",
        )
    try:
        return await service.cheap_destinations(query)
    except FlightProviderError as exc:
        logger.warning("Cheap destinations lookup failed", exc_info=exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cheap fares are temporarily unavailable.",
        ) from exc
