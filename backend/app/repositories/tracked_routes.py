import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import TrackedRoute
from app.schemas.tracked_routes import TrackedRouteCreate


class TrackedRouteRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_owner(self, anonymous_id: uuid.UUID) -> list[TrackedRoute]:
        statement = (
            select(TrackedRoute)
            .where(TrackedRoute.anonymous_id == anonymous_id, TrackedRoute.active.is_(True))
            .order_by(TrackedRoute.created_at.desc())
        )
        return list((await self.session.scalars(statement)).all())

    async def list_active(self, limit: int = 500) -> list[TrackedRoute]:
        statement = (
            select(TrackedRoute)
            .where(TrackedRoute.active.is_(True))
            .order_by(TrackedRoute.created_at)
            .limit(limit)
        )
        return list((await self.session.scalars(statement)).all())

    async def get_for_owner(
        self, route_id: uuid.UUID, anonymous_id: uuid.UUID
    ) -> TrackedRoute | None:
        route: TrackedRoute | None = await self.session.scalar(
            select(TrackedRoute).where(
                TrackedRoute.id == route_id,
                TrackedRoute.anonymous_id == anonymous_id,
                TrackedRoute.active.is_(True),
            )
        )
        return route

    async def create_or_get(
        self, anonymous_id: uuid.UUID, request: TrackedRouteCreate
    ) -> TrackedRoute:
        criteria = request.model_dump(mode="python")
        existing_statement = select(TrackedRoute).where(
            TrackedRoute.anonymous_id == anonymous_id,
            TrackedRoute.active.is_(True),
            *(getattr(TrackedRoute, key) == value for key, value in criteria.items()),
        )
        existing = await self.session.scalar(existing_statement)
        if existing is not None:
            return existing

        route = TrackedRoute(anonymous_id=anonymous_id, active=True, **criteria)
        self.session.add(route)
        await self.session.commit()
        await self.session.refresh(route)
        return route

    async def update_price(
        self,
        route: TrackedRoute,
        price: Decimal,
        currency: str,
        checked_at: datetime,
    ) -> TrackedRoute:
        route.previous_price = route.last_price
        route.last_price = price
        route.currency = currency
        route.last_checked_at = checked_at
        await self.session.commit()
        await self.session.refresh(route)
        return route

    async def delete_for_owner(self, route_id: uuid.UUID, anonymous_id: uuid.UUID) -> bool:
        statement = select(TrackedRoute).where(
            TrackedRoute.id == route_id,
            TrackedRoute.anonymous_id == anonymous_id,
            TrackedRoute.active.is_(True),
        )
        route = await self.session.scalar(statement)
        if route is None:
            return False
        route.active = False
        await self.session.commit()
        return True
