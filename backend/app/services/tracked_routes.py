import uuid

from app.repositories.tracked_routes import TrackedRouteRepository
from app.schemas.tracked_routes import TrackedRouteCreate, TrackedRouteResponse


class TrackedRouteService:
    def __init__(self, repository: TrackedRouteRepository) -> None:
        self.repository = repository

    async def list(self, anonymous_id: uuid.UUID) -> list[TrackedRouteResponse]:
        routes = await self.repository.list_for_owner(anonymous_id)
        return [
            TrackedRouteResponse.model_validate(route, from_attributes=True) for route in routes
        ]

    async def create(
        self, anonymous_id: uuid.UUID, request: TrackedRouteCreate
    ) -> TrackedRouteResponse:
        route = await self.repository.create_or_get(anonymous_id, request)
        return TrackedRouteResponse.model_validate(route, from_attributes=True)

    async def delete(self, route_id: uuid.UUID, anonymous_id: uuid.UUID) -> bool:
        return await self.repository.delete_for_owner(route_id, anonymous_id)
