import uuid
from decimal import Decimal

from app.core.config import get_settings
from app.models.entities import Notification, PriceAlert, TrackedRoute, User
from app.repositories.alerts import NotificationRepository, PriceAlertRepository
from app.repositories.tracked_routes import TrackedRouteRepository
from app.schemas.alerts import (
    NotificationResponse,
    PriceAlertCreate,
    PriceAlertResponse,
    PriceAlertUpdate,
)
from app.services import email as email_sender


def to_alert_response(alert: PriceAlert, route: TrackedRoute) -> PriceAlertResponse:
    return PriceAlertResponse(
        id=alert.id,
        route_id=alert.route_id,
        origin=route.origin,
        destination=route.destination,
        target_price=alert.target_price,
        drop_percent=alert.drop_percent,
        active=alert.active,
        last_notified_price=alert.last_notified_price,
        created_at=alert.created_at,
    )


def to_notification_response(
    notification: Notification, route: TrackedRoute | None
) -> NotificationResponse:
    return NotificationResponse(
        id=notification.id,
        kind=notification.kind,
        route_id=notification.route_id,
        origin=route.origin if route is not None else None,
        destination=route.destination if route is not None else None,
        price=notification.price,
        currency=notification.currency,
        previous_price=notification.previous_price,
        read_at=notification.read_at,
        created_at=notification.created_at,
    )


def drop_percent_between(previous: Decimal, current: Decimal) -> Decimal:
    if previous <= 0:
        return Decimal(0)
    return (previous - current) / previous * Decimal(100)


class AlertService:
    def __init__(
        self,
        alerts: PriceAlertRepository,
        notifications: NotificationRepository,
        routes: TrackedRouteRepository,
    ) -> None:
        self.alerts = alerts
        self.notifications = notifications
        self.routes = routes

    async def list(self, user_id: uuid.UUID) -> list[PriceAlertResponse]:
        return [
            to_alert_response(alert, route)
            for alert, route in await self.alerts.list_for_user(user_id)
        ]

    async def create(
        self, user_id: uuid.UUID, request: PriceAlertCreate
    ) -> PriceAlertResponse | None:
        route = await self.routes.get_for_owner(request.route_id, user_id=user_id)
        if route is None:
            return None
        existing = await self.alerts.find_matching(
            user_id, request.route_id, request.target_price, request.drop_percent
        )
        alert = (
            existing
            if existing is not None
            else await self.alerts.create(
                user_id, request.route_id, request.target_price, request.drop_percent
            )
        )
        return to_alert_response(alert, route)

    async def update(
        self, alert_id: uuid.UUID, user_id: uuid.UUID, updates: PriceAlertUpdate
    ) -> PriceAlertResponse | None:
        alert = await self.alerts.get_for_user(alert_id, user_id)
        if alert is None:
            return None
        patch = updates.model_dump(exclude_unset=True)
        merged = {
            "target_price": patch.get("target_price", alert.target_price),
            "drop_percent": patch.get("drop_percent", alert.drop_percent),
        }
        if merged["target_price"] is None and merged["drop_percent"] is None:
            raise ValueError("An alert needs a target price, a drop percentage, or both.")
        alert.target_price = merged["target_price"]
        alert.drop_percent = merged["drop_percent"]
        if patch.get("active") is not None:
            alert.active = patch["active"]
        saved = await self.alerts.save(alert)
        route = await self.routes.get_for_owner(saved.route_id, user_id=user_id)
        if route is None:  # Route removed after the alert was created.
            return None
        return to_alert_response(saved, route)

    async def delete(self, alert_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        alert = await self.alerts.get_for_user(alert_id, user_id)
        if alert is None:
            return False
        await self.alerts.delete(alert)
        return True

    async def evaluate_route(self, route: TrackedRoute, user: User | None) -> None:
        """Create notifications (and emails) for alerts whose conditions just became true.

        Only fires on a new low versus the alert's last notified price, so repeated
        refreshes at the same price stay quiet.
        """
        if route.user_id is None or route.last_price is None or route.currency is None:
            return
        current = route.last_price
        alerts = await self.alerts.active_for_route(route.id)
        if not alerts:
            return
        for alert in alerts:
            kind = self._triggered_kind(alert, current, route.previous_price)
            if kind is None:
                continue
            if alert.last_notified_price is not None and current >= alert.last_notified_price:
                continue
            await self.notifications.create(
                user_id=route.user_id,
                kind=kind,
                price=current,
                currency=route.currency,
                route_id=route.id,
                alert_id=alert.id,
                previous_price=route.previous_price,
            )
            alert.last_notified_price = current
            # save() commits the pending notification row too (shared session).
            await self.alerts.save(alert)
            if user is not None and user.email:
                await email_sender.send_alert_email(
                    email_sender.build_alert_email(
                        to=user.email,
                        origin=route.origin,
                        destination=route.destination,
                        kind=kind,
                        price=current,
                        currency=route.currency,
                        previous_price=route.previous_price,
                        manage_url=f"{get_settings().app_base_url}/tracked/{route.id}",
                    )
                )

    @staticmethod
    def _triggered_kind(
        alert: PriceAlert, current: Decimal, previous: Decimal | None
    ) -> str | None:
        target_hit = alert.target_price is not None and current <= alert.target_price
        drop_hit = (
            alert.drop_percent is not None
            and previous is not None
            and previous > current
            and drop_percent_between(previous, current) >= alert.drop_percent
        )
        if target_hit:
            return "target_hit"
        if drop_hit:
            return "price_drop"
        return None
