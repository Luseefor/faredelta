import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Response, status
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import (
    CurrentUserIdOptional,
    TrackedRouteRefreshServiceDependency,
    TrackedRouteServiceDependency,
)
from app.schemas.tracked_routes import TrackedRouteCreate, TrackedRouteResponse, TrackedRouteUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tracked-routes", tags=["tracked routes"])
AnonymousIdOptional = Annotated[uuid.UUID | None, Header(alias="X-FareDelta-Anonymous-ID")]


def resolve_owner(
    user_id: uuid.UUID | None, anonymous_id: uuid.UUID | None
) -> tuple[uuid.UUID | None, uuid.UUID | None]:
    if user_id is not None:
        return user_id, None
    if anonymous_id is None:
        raise HTTPException(
            status_code=401, detail="Sign in or provide an anonymous session."
        )
    return None, anonymous_id


@router.get("", response_model=list[TrackedRouteResponse])
async def list_tracked_routes(
    service: TrackedRouteServiceDependency,
    user_id: CurrentUserIdOptional,
    anonymous_id: AnonymousIdOptional = None,
) -> list[TrackedRouteResponse]:
    owner_id, anon_id = resolve_owner(user_id, anonymous_id)
    try:
        return await service.list(user_id=owner_id, anonymous_id=anon_id)
    except SQLAlchemyError as exc:
        logger.exception("Could not list tracked routes")
        raise HTTPException(
            status_code=503, detail="Tracked routes are temporarily unavailable."
        ) from exc


@router.post("", response_model=TrackedRouteResponse, status_code=status.HTTP_201_CREATED)
async def create_tracked_route(
    request: TrackedRouteCreate,
    service: TrackedRouteServiceDependency,
    user_id: CurrentUserIdOptional,
    anonymous_id: AnonymousIdOptional = None,
) -> TrackedRouteResponse:
    owner_id, anon_id = resolve_owner(user_id, anonymous_id)
    try:
        return await service.create(request, user_id=owner_id, anonymous_id=anon_id)
    except SQLAlchemyError as exc:
        logger.exception("Could not save tracked route")
        raise HTTPException(status_code=503, detail="The route could not be saved.") from exc


@router.get("/{route_id}", response_model=TrackedRouteResponse)
async def get_tracked_route(
    route_id: uuid.UUID,
    service: TrackedRouteServiceDependency,
    user_id: CurrentUserIdOptional,
    anonymous_id: AnonymousIdOptional = None,
) -> TrackedRouteResponse:
    owner_id, anon_id = resolve_owner(user_id, anonymous_id)
    try:
        route = await service.get(route_id, user_id=owner_id, anonymous_id=anon_id)
    except SQLAlchemyError as exc:
        logger.exception("Could not load tracked route")
        raise HTTPException(status_code=503, detail="The route could not be loaded.") from exc
    if route is None:
        raise HTTPException(status_code=404, detail="Tracked route not found.")
    return route


@router.patch("/{route_id}", response_model=TrackedRouteResponse)
async def update_tracked_route(
    route_id: uuid.UUID,
    update: TrackedRouteUpdate,
    service: TrackedRouteServiceDependency,
    user_id: CurrentUserIdOptional,
    anonymous_id: AnonymousIdOptional = None,
) -> TrackedRouteResponse:
    owner_id, anon_id = resolve_owner(user_id, anonymous_id)
    try:
        route = await service.update(
            route_id, update, user_id=owner_id, anonymous_id=anon_id
        )
    except ValidationError as exc:
        detail = "; ".join(error["msg"] for error in exc.errors())
        raise HTTPException(
            status_code=422, detail=detail or "The route update is invalid."
        ) from exc
    except SQLAlchemyError as exc:
        logger.exception("Could not update tracked route")
        raise HTTPException(status_code=503, detail="The route could not be updated.") from exc
    if route is None:
        raise HTTPException(status_code=404, detail="Tracked route not found.")
    return route


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tracked_route(
    route_id: uuid.UUID,
    service: TrackedRouteServiceDependency,
    user_id: CurrentUserIdOptional,
    anonymous_id: AnonymousIdOptional = None,
) -> Response:
    owner_id, anon_id = resolve_owner(user_id, anonymous_id)
    try:
        deleted = await service.delete(route_id, user_id=owner_id, anonymous_id=anon_id)
    except SQLAlchemyError as exc:
        logger.exception("Could not remove tracked route")
        raise HTTPException(status_code=503, detail="The route could not be removed.") from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Tracked route not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{route_id}/refresh", response_model=TrackedRouteResponse)
async def refresh_tracked_route(
    route_id: uuid.UUID,
    service: TrackedRouteRefreshServiceDependency,
    user_id: CurrentUserIdOptional,
    anonymous_id: AnonymousIdOptional = None,
) -> TrackedRouteResponse:
    owner_id, anon_id = resolve_owner(user_id, anonymous_id)
    try:
        route = await service.refresh_for_owner(
            route_id, user_id=owner_id, anonymous_id=anon_id
        )
    except SQLAlchemyError as exc:
        logger.exception("Could not refresh tracked route")
        raise HTTPException(status_code=503, detail="The route could not be refreshed.") from exc
    if route is None:
        raise HTTPException(status_code=404, detail="Tracked route not found.")
    return route
