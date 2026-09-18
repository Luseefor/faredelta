import uuid

from app.repositories.tracked_routes import TrackedRouteRepository
from app.schemas.flights import FlightSearchRequest
from app.schemas.tracked_routes import TrackedRouteCreate, TrackedRouteResponse, TrackedRouteUpdate

CRITERIA_FIELDS = (
    "earliest_departure_date",
    "latest_departure_date",
    "earliest_return_date",
    "latest_return_date",
    "travelers",
    "cabin_class",
    "maximum_stops",
    "origin_alternates",
    "destination_alternates",
)


class TrackedRouteService:
    def __init__(self, repository: TrackedRouteRepository) -> None:
        self.repository = repository

    async def list(
        self, user_id: uuid.UUID | None = None, anonymous_id: uuid.UUID | None = None
    ) -> list[TrackedRouteResponse]:
        routes = await self.repository.list_for_owner(user_id=user_id, anonymous_id=anonymous_id)
        return [
            TrackedRouteResponse.model_validate(route, from_attributes=True) for route in routes
        ]

    async def get(
        self,
        route_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
        anonymous_id: uuid.UUID | None = None,
    ) -> TrackedRouteResponse | None:
        route = await self.repository.get_for_owner(
            route_id, user_id=user_id, anonymous_id=anonymous_id
        )
        if route is None:
            return None
        return TrackedRouteResponse.model_validate(route, from_attributes=True)

    async def create(
        self,
        request: TrackedRouteCreate,
        user_id: uuid.UUID | None = None,
        anonymous_id: uuid.UUID | None = None,
    ) -> TrackedRouteResponse:
        route = await self.repository.create_or_get(
            request, user_id=user_id, anonymous_id=anonymous_id
        )
        return TrackedRouteResponse.model_validate(route, from_attributes=True)

    async def update(
        self,
        route_id: uuid.UUID,
        updates: TrackedRouteUpdate,
        user_id: uuid.UUID | None = None,
        anonymous_id: uuid.UUID | None = None,
    ) -> TrackedRouteResponse | None:
        route = await self.repository.get_for_owner(
            route_id, user_id=user_id, anonymous_id=anonymous_id
        )
        if route is None:
            return None
        patch = updates.model_dump(exclude_unset=True)
        merged = {field: getattr(route, field) for field in CRITERIA_FIELDS}
        merged.update({key: value for key, value in patch.items() if key in CRITERIA_FIELDS})
        # Raises pydantic.ValidationError on inconsistent windows; the route layer maps it to 422.
        FlightSearchRequest(
            origin=route.origin,
            destination=route.destination,
            trip_type=route.trip_type,
            **merged,
        )
        criteria_changed = any(key in CRITERIA_FIELDS for key in patch)
        updated = await self.repository.apply_update(
            route, patch, reset_baseline=criteria_changed
        )
        return TrackedRouteResponse.model_validate(updated, from_attributes=True)

    async def delete(
        self,
        route_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
        anonymous_id: uuid.UUID | None = None,
    ) -> bool:
        return await self.repository.delete_for_owner(
            route_id, user_id=user_id, anonymous_id=anonymous_id
        )

    async def claim(
        self, anonymous_id: uuid.UUID, user_id: uuid.UUID
    ) -> int:
        return await self.repository.claim_anonymous_to_user(anonymous_id, user_id)
