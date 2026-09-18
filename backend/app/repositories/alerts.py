import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Notification, PriceAlert, TrackedRoute


class PriceAlertRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_user(self, user_id: uuid.UUID) -> list[tuple[PriceAlert, TrackedRoute]]:
        statement = (
            select(PriceAlert, TrackedRoute)
            .join(TrackedRoute, TrackedRoute.id == PriceAlert.route_id)
            .where(PriceAlert.user_id == user_id, TrackedRoute.active.is_(True))
            .order_by(PriceAlert.created_at.desc())
        )
        return [row.tuple() for row in (await self.session.execute(statement)).all()]

    async def get_for_user(
        self, alert_id: uuid.UUID, user_id: uuid.UUID
    ) -> PriceAlert | None:
        alert: PriceAlert | None = await self.session.scalar(
            select(PriceAlert).where(PriceAlert.id == alert_id, PriceAlert.user_id == user_id)
        )
        return alert

    async def find_matching(
        self,
        user_id: uuid.UUID,
        route_id: uuid.UUID,
        target_price: Decimal | None,
        drop_percent: Decimal | None,
    ) -> PriceAlert | None:
        alert: PriceAlert | None = await self.session.scalar(
            select(PriceAlert).where(
                PriceAlert.user_id == user_id,
                PriceAlert.route_id == route_id,
                PriceAlert.target_price == target_price,
                PriceAlert.drop_percent == drop_percent,
                PriceAlert.active.is_(True),
            )
        )
        return alert

    async def active_for_route(self, route_id: uuid.UUID) -> list[PriceAlert]:
        statement = select(PriceAlert).where(
            PriceAlert.route_id == route_id, PriceAlert.active.is_(True)
        )
        return list((await self.session.scalars(statement)).all())

    async def create(
        self,
        user_id: uuid.UUID,
        route_id: uuid.UUID,
        target_price: Decimal | None,
        drop_percent: Decimal | None,
    ) -> PriceAlert:
        alert = PriceAlert(
            user_id=user_id,
            route_id=route_id,
            target_price=target_price,
            drop_percent=drop_percent,
            active=True,
        )
        self.session.add(alert)
        await self.session.commit()
        await self.session.refresh(alert)
        return alert

    async def save(self, alert: PriceAlert) -> PriceAlert:
        await self.session.commit()
        await self.session.refresh(alert)
        return alert

    async def delete(self, alert: PriceAlert) -> None:
        await self.session.delete(alert)
        await self.session.commit()


class NotificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        user_id: uuid.UUID,
        kind: str,
        price: Decimal,
        currency: str,
        route_id: uuid.UUID | None = None,
        alert_id: uuid.UUID | None = None,
        previous_price: Decimal | None = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            route_id=route_id,
            alert_id=alert_id,
            kind=kind,
            price=price,
            currency=currency,
            previous_price=previous_price,
        )
        self.session.add(notification)
        return notification

    async def list_for_user(
        self, user_id: uuid.UUID, limit: int = 50
    ) -> list[tuple[Notification, TrackedRoute | None]]:
        statement = (
            select(Notification, TrackedRoute)
            .outerjoin(TrackedRoute, TrackedRoute.id == Notification.route_id)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return [row.tuple() for row in (await self.session.execute(statement)).all()]

    async def unread_count(self, user_id: uuid.UUID) -> int:
        result = await self.session.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        )
        return int(result or 0)

    async def get_for_user(
        self, notification_id: uuid.UUID, user_id: uuid.UUID
    ) -> tuple[Notification, TrackedRoute | None] | None:
        row = (
            await self.session.execute(
                select(Notification, TrackedRoute)
                .outerjoin(TrackedRoute, TrackedRoute.id == Notification.route_id)
                .where(Notification.id == notification_id, Notification.user_id == user_id)
            )
        ).first()
        return row.tuple() if row is not None else None

    async def mark_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        notification: Notification | None = await self.session.scalar(
            select(Notification).where(
                Notification.id == notification_id, Notification.user_id == user_id
            )
        )
        if notification is None:
            return False
        if notification.read_at is None:
            notification.read_at = datetime.now(UTC)
            await self.session.commit()
        return True

    async def mark_all_read(self, user_id: uuid.UUID) -> int:
        unread = list(
            (
                await self.session.scalars(
                    select(Notification).where(
                        Notification.user_id == user_id, Notification.read_at.is_(None)
                    )
                )
            ).all()
        )
        if not unread:
            await self.session.commit()
            return 0
        now = datetime.now(UTC)
        for notification in unread:
            notification.read_at = now
        await self.session.commit()
        return len(unread)
