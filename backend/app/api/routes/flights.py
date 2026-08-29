import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import FlightSearchServiceDependency
from app.core.exceptions import FlightProviderError
from app.schemas.flights import FlightSearchRequest, FlightSearchResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/flights", tags=["flights"])


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
