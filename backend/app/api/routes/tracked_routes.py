import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Response, status
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import (
    TrackedRouteRefreshServiceDependency,
    TrackedRouteServiceDependency,
)
from app.schemas.tracked_routes import TrackedRouteCreate, TrackedRouteResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tracked-routes", tags=["tracked routes"])
AnonymousId = Annotated[uuid.UUID, Header(alias="X-FareDelta-Anonymous-ID")]


@router.get("", response_model=list[TrackedRouteResponse])
async def list_tracked_routes(
    anonymous_id: AnonymousId, service: TrackedRouteServiceDependency
) -> list[TrackedRouteResponse]:
    try:
        return await service.list(anonymous_id)
    except SQLAlchemyError as exc:
        logger.exception("Could not list tracked routes")
        raise HTTPException(
            status_code=503, detail="Tracked routes are temporarily unavailable."
        ) from exc


@router.post("", response_model=TrackedRouteResponse, status_code=status.HTTP_201_CREATED)
async def create_tracked_route(
    request: TrackedRouteCreate,
    anonymous_id: AnonymousId,
    service: TrackedRouteServiceDependency,
) -> TrackedRouteResponse:
    try:
        return await service.create(anonymous_id, request)
    except SQLAlchemyError as exc:
        logger.exception("Could not save tracked route")
        raise HTTPException(status_code=503, detail="The route could not be saved.") from exc


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tracked_route(
    route_id: uuid.UUID,
    anonymous_id: AnonymousId,
    service: TrackedRouteServiceDependency,
) -> Response:
    try:
        deleted = await service.delete(route_id, anonymous_id)
    except SQLAlchemyError as exc:
        logger.exception("Could not remove tracked route")
        raise HTTPException(status_code=503, detail="The route could not be removed.") from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Tracked route not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{route_id}/refresh", response_model=TrackedRouteResponse)
async def refresh_tracked_route(
    route_id: uuid.UUID,
    anonymous_id: AnonymousId,
    service: TrackedRouteRefreshServiceDependency,
) -> TrackedRouteResponse:
    try:
        route = await service.refresh_for_owner(route_id, anonymous_id)
    except SQLAlchemyError as exc:
        logger.exception("Could not refresh tracked route")
        raise HTTPException(status_code=503, detail="The route could not be refreshed.") from exc
    if route is None:
        raise HTTPException(status_code=404, detail="Tracked route not found.")
    return route
