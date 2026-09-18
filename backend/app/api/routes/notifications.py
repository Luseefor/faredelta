import logging
import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import CurrentUserIdOptional, NotificationRepositoryDependency
from app.schemas.alerts import NotificationListResponse, NotificationResponse, ReadAllResponse
from app.services.alerts import to_notification_response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def require_user(user_id: uuid.UUID | None) -> uuid.UUID:
    if user_id is None:
        raise HTTPException(status_code=401, detail="Sign in to view notifications.")
    return user_id


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    user_id: CurrentUserIdOptional, repository: NotificationRepositoryDependency
) -> NotificationListResponse:
    owner = require_user(user_id)
    try:
        pairs = await repository.list_for_user(owner)
        unread = await repository.unread_count(owner)
    except SQLAlchemyError as exc:
        logger.exception("Could not list notifications")
        raise HTTPException(
            status_code=503, detail="Notifications are temporarily unavailable."
        ) from exc
    return NotificationListResponse(
        notifications=[to_notification_response(item, route) for item, route in pairs],
        unread_count=unread,
    )


@router.post("/read-all", response_model=ReadAllResponse)
async def read_all_notifications(
    user_id: CurrentUserIdOptional, repository: NotificationRepositoryDependency
) -> ReadAllResponse:
    owner = require_user(user_id)
    try:
        read = await repository.mark_all_read(owner)
    except SQLAlchemyError as exc:
        logger.exception("Could not mark notifications read")
        raise HTTPException(
            status_code=503, detail="Notifications are temporarily unavailable."
        ) from exc
    return ReadAllResponse(read=read)


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def read_notification(
    notification_id: uuid.UUID,
    user_id: CurrentUserIdOptional,
    repository: NotificationRepositoryDependency,
) -> NotificationResponse:
    owner = require_user(user_id)
    try:
        marked = await repository.mark_read(notification_id, owner)
        pair = await repository.get_for_user(notification_id, owner) if marked else None
    except SQLAlchemyError as exc:
        logger.exception("Could not mark notification read")
        raise HTTPException(
            status_code=503, detail="Notifications are temporarily unavailable."
        ) from exc
    if pair is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    item, route = pair
    return to_notification_response(item, route)
