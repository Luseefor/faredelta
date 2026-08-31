from fastapi import APIRouter, Response, status
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError, ProgrammingError

from app.api.dependencies import SessionDependency
from app.models.entities import FlightSearch

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(response: Response, session: SessionDependency) -> dict[str, str]:
    try:
        await session.execute(select(FlightSearch.id).limit(1))
    except (DBAPIError, ProgrammingError):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "unavailable",
            "service": "faredelta-api",
            "database": "unavailable",
        }
    return {"status": "ok", "service": "faredelta-api", "database": "ready"}
