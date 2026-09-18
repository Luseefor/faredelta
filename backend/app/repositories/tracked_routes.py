import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.models.entities import TrackedRoute
from app.schemas.tracked_routes import TrackedRouteCreate


def _owner_condition(
    user_id: uuid.UUID | None, anonymous_id: uuid.UUID | None
) -> ColumnElement[bool]:
    if user_id is not None:
        return TrackedRoute.user_id == user_id
    assert anonymous_id is not None
    return TrackedRoute.anonymous_id == anonymous_id


def _criteria_conditions(request: TrackedRouteCreate) -> list[ColumnElement[bool]]:
    criteria = request.model_dump(mode="python")
    return [(getattr(TrackedRoute, key) == value) for key, value in criteria.items()]


class TrackedRouteRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_owner(
        self, user_id: uuid.UUID | None = None, anonymous_id: uuid.UUID | None = None
    ) -> list[TrackedRoute]:
        statement = (
            select(TrackedRoute)
            .where(_owner_condition(user_id, anonymous_id), TrackedRoute.active.is_(True))
            .order_by(TrackedRoute.created_at.desc())
        )
        return list((await self.session.scalars(statement)).all())

    async def list_active(
        self, limit: int = 500, exclude_paused: bool = False
    ) -> list[TrackedRoute]:
        conditions = [TrackedRoute.active.is_(True)]
        if exclude_paused:
            conditions.append(TrackedRoute.paused.is_(False))
        statement = (
            select(TrackedRoute)
            .where(*conditions)
            .order_by(TrackedRoute.created_at)
            .limit(limit)
        )
        return list((await self.session.scalars(statement)).all())

    async def list_due_for_refresh(
        self, at: datetime, limit: int = 500
    ) -> list[TrackedRoute]:
        """Routes the scheduled job should check: active, unpaused, and due."""
        statement = (
            select(TrackedRoute)
            .where(
                TrackedRoute.active.is_(True),
                TrackedRoute.paused.is_(False),
                (TrackedRoute.next_refresh_at.is_(None))
                | (TrackedRoute.next_refresh_at <= at),
            )
            .order_by(TrackedRoute.next_refresh_at.asc().nulls_first())
            .limit(limit)
        )
        return list((await self.session.scalars(statement)).all())

    async def record_refresh_success(self, route: TrackedRoute, at: datetime) -> None:
        route.consecutive_failures = 0
        route.next_refresh_at = at + timedelta(hours=route.refresh_cadence_hours)
        await self.session.commit()

    async def record_refresh_failure(self, route: TrackedRoute, at: datetime) -> None:
        route.consecutive_failures = route.consecutive_failures + 1
        backoff_hours = min(2 ** min(route.consecutive_failures, 6), 72)
        route.next_refresh_at = at + timedelta(hours=backoff_hours)
        await self.session.commit()

    async def get_for_owner(
        self,
        route_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
        anonymous_id: uuid.UUID | None = None,
    ) -> TrackedRoute | None:
        route: TrackedRoute | None = await self.session.scalar(
            select(TrackedRoute).where(
                TrackedRoute.id == route_id,
                _owner_condition(user_id, anonymous_id),
                TrackedRoute.active.is_(True),
            )
        )
        return route

    async def create_or_get(
        self,
        request: TrackedRouteCreate,
        user_id: uuid.UUID | None = None,
        anonymous_id: uuid.UUID | None = None,
    ) -> TrackedRoute:
        existing_statement = select(TrackedRoute).where(
            _owner_condition(user_id, anonymous_id),
            TrackedRoute.active.is_(True),
            *_criteria_conditions(request),
        )
        existing = await self.session.scalar(existing_statement)
        if existing is not None:
            return existing

        route = TrackedRoute(
            user_id=user_id,
            anonymous_id=anonymous_id,
            active=True,
            **request.model_dump(mode="python"),
        )
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

    async def apply_update(
        self, route: TrackedRoute, fields: dict[str, object], reset_baseline: bool
    ) -> TrackedRoute:
        for key, value in fields.items():
            setattr(route, key, value)
        if reset_baseline:
            route.previous_price = None
            route.last_price = None
            route.currency = None
            route.last_checked_at = None
        await self.session.commit()
        await self.session.refresh(route)
        return route

    async def delete_for_owner(
        self,
        route_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
        anonymous_id: uuid.UUID | None = None,
    ) -> bool:
        statement = select(TrackedRoute).where(
            TrackedRoute.id == route_id,
            _owner_condition(user_id, anonymous_id),
            TrackedRoute.active.is_(True),
        )
        route = await self.session.scalar(statement)
        if route is None:
            return False
        route.active = False
        await self.session.commit()
        return True

    async def claim_anonymous_to_user(
        self, anonymous_id: uuid.UUID, user_id: uuid.UUID
    ) -> int:
        anonymous_routes = await self.session.scalars(
            select(TrackedRoute).where(
                TrackedRoute.anonymous_id == anonymous_id,
                TrackedRoute.user_id.is_(None),
                TrackedRoute.active.is_(True),
            )
        )
        claimed = 0
        for route in anonymous_routes:
            duplicate = await self.session.scalar(
                select(TrackedRoute).where(
                    TrackedRoute.user_id == user_id,
                    TrackedRoute.active.is_(True),
                    TrackedRoute.origin == route.origin,
                    TrackedRoute.destination == route.destination,
                    TrackedRoute.earliest_departure_date == route.earliest_departure_date,
                    TrackedRoute.latest_departure_date == route.latest_departure_date,
                    TrackedRoute.earliest_return_date == route.earliest_return_date,
                    TrackedRoute.latest_return_date == route.latest_return_date,
                    TrackedRoute.travelers == route.travelers,
                    TrackedRoute.cabin_class == route.cabin_class,
                    TrackedRoute.maximum_stops == route.maximum_stops,
                )
            )
            if duplicate is not None:
                route.active = False
            else:
                route.user_id = user_id
                route.anonymous_id = None
                claimed += 1
        await self.session.commit()
        return claimed
