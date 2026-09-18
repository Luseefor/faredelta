import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, model_validator

from app.schemas.flights import CabinClass, FlightSearchRequest


class TrackedRouteCreate(FlightSearchRequest):
    pass


class TrackedRouteResponse(FlightSearchRequest):
    id: uuid.UUID
    active: bool
    paused: bool
    created_at: datetime
    refresh_cadence_hours: int = Field(ge=6, le=168)
    next_refresh_at: datetime | None = None
    consecutive_failures: int = Field(ge=0)
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


class TrackedRouteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    earliest_departure_date: date | None = None
    latest_departure_date: date | None = None
    earliest_return_date: date | None = None
    latest_return_date: date | None = None
    travelers: int | None = Field(default=None, ge=1, le=9)
    cabin_class: CabinClass | None = None
    maximum_stops: int | None = Field(default=None, ge=0, le=2)
    paused: bool | None = None
    refresh_cadence_hours: int | None = Field(default=None, ge=6, le=168)
    origin_alternates: list[str] | None = Field(default=None, max_length=1)
    destination_alternates: list[str] | None = Field(default=None, max_length=1)

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "TrackedRouteUpdate":
        if all(value is None for value in self.model_dump().values()):
            raise ValueError("Provide at least one field to update.")
        return self
