import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_serializer

from app.schemas.flights import FlightSearchRequest


class TrackedRouteCreate(FlightSearchRequest):
    pass


class TrackedRouteResponse(FlightSearchRequest):
    id: uuid.UUID
    active: bool
    created_at: datetime
    previous_price: Decimal | None = Field(default=None, gt=0)
    last_price: Decimal | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    last_checked_at: datetime | None = None

    @field_serializer("previous_price", "last_price", when_used="json")
    def serialize_price(self, value: Decimal | None) -> float | None:
        return float(value) if value is not None else None


class TrackedRouteRefreshSummary(BaseModel):
    refreshed: int = Field(ge=0)
    failed: int = Field(ge=0)
