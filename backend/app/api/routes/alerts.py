import logging
import uuid

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import AlertServiceDependency, CurrentUserIdOptional
from app.schemas.alerts import PriceAlertCreate, PriceAlertResponse, PriceAlertUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def require_user(user_id: uuid.UUID | None) -> uuid.UUID:
    if user_id is None:
        raise HTTPException(status_code=401, detail="Sign in to use price alerts.")
    return user_id


@router.get("", response_model=list[PriceAlertResponse])
async def list_alerts(
    user_id: CurrentUserIdOptional, service: AlertServiceDependency
) -> list[PriceAlertResponse]:
    owner = require_user(user_id)
    try:
        return await service.list(owner)
    except SQLAlchemyError as exc:
        logger.exception("Could not list price alerts")
        raise HTTPException(
            status_code=503, detail="Price alerts are temporarily unavailable."
        ) from exc


@router.post("", response_model=PriceAlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    request: PriceAlertCreate,
    user_id: CurrentUserIdOptional,
    service: AlertServiceDependency,
) -> PriceAlertResponse:
    owner = require_user(user_id)
    try:
        alert = await service.create(owner, request)
    except SQLAlchemyError as exc:
        logger.exception("Could not create price alert")
        raise HTTPException(status_code=503, detail="The alert could not be saved.") from exc
    if alert is None:
        raise HTTPException(status_code=404, detail="Tracked route not found.")
    return alert


@router.patch("/{alert_id}", response_model=PriceAlertResponse)
async def update_alert(
    alert_id: uuid.UUID,
    update: PriceAlertUpdate,
    user_id: CurrentUserIdOptional,
    service: AlertServiceDependency,
) -> PriceAlertResponse:
    owner = require_user(user_id)
    try:
        alert = await service.update(alert_id, owner, update)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        logger.exception("Could not update price alert")
        raise HTTPException(status_code=503, detail="The alert could not be updated.") from exc
    if alert is None:
        raise HTTPException(status_code=404, detail="Price alert not found.")
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: uuid.UUID,
    user_id: CurrentUserIdOptional,
    service: AlertServiceDependency,
) -> Response:
    owner = require_user(user_id)
    try:
        deleted = await service.delete(alert_id, owner)
    except SQLAlchemyError as exc:
        logger.exception("Could not delete price alert")
        raise HTTPException(status_code=503, detail="The alert could not be deleted.") from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Price alert not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
