import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import (
    AuthServiceDependency,
    CurrentUserIdOptional,
    TrackedRouteServiceDependency,
)
from app.schemas.auth import ClaimRequest, ClaimResponse, UserResponse
from app.services.auth import to_user_response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me", response_model=UserResponse)
async def get_me(
    user_id: CurrentUserIdOptional, service: AuthServiceDependency
) -> UserResponse:
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not signed in.")
    user = await service.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Not signed in.")
    return to_user_response(user)


@router.post("/claim", response_model=ClaimResponse)
async def claim_anonymous_routes(
    request: ClaimRequest,
    user_id: CurrentUserIdOptional,
    service: TrackedRouteServiceDependency,
) -> ClaimResponse:
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not signed in.")
    try:
        claimed = await service.claim(request.anonymous_id, user_id)
    except SQLAlchemyError as exc:
        logger.exception("Could not claim tracked routes")
        raise HTTPException(status_code=503, detail="Could not claim tracked routes.") from exc
    return ClaimResponse(claimed=claimed)
