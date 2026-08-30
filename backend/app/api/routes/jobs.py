import hmac
import logging
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException

from app.api.dependencies import TrackedRouteRefreshServiceDependency
from app.core.config import get_settings
from app.schemas.tracked_routes import TrackedRouteRefreshSummary

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("/refresh-tracked-routes", response_model=TrackedRouteRefreshSummary)
async def refresh_tracked_routes(
    service: TrackedRouteRefreshServiceDependency,
    token: Annotated[str | None, Header(alias="X-FareDelta-Job-Token")] = None,
) -> TrackedRouteRefreshSummary:
    expected = get_settings().tracked_route_job_token
    if not expected:
        raise HTTPException(status_code=503, detail="Scheduled refreshes are not configured.")
    if not token or not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="Invalid job token.")
    result = await service.refresh_all()
    logger.info("Tracked route refresh completed", extra=result.model_dump())
    return result
