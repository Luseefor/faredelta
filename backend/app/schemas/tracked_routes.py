import uuid
from datetime import datetime

from app.schemas.flights import FlightSearchRequest


class TrackedRouteCreate(FlightSearchRequest):
    pass


class TrackedRouteResponse(FlightSearchRequest):
    id: uuid.UUID
    active: bool
    created_at: datetime
