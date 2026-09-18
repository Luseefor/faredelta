from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_serializer


class CheapDestination(BaseModel):
    origin: str
    destination: str
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    currency: str
    airline: str | None = None
    flight_number: str | None = None
    departure_at: datetime | None = None
    return_at: datetime | None = None
    transfers: int = Field(default=0, ge=0)

    @field_serializer("price", when_used="json")
    def serialize_price(self, value: Decimal) -> float:
        return float(value)


class CheapDestinationsResponse(BaseModel):
    origin: str
    currency: str
    result_count: int = Field(ge=0)
    destinations: list[CheapDestination]


class CheapDestinationsQuery(BaseModel):
    origin: str = Field(pattern=r"^[A-Z]{3}$")
    depart_date: date | None = None
    return_date: date | None = None
    currency: str = Field(default="USD", pattern=r"^[A-Za-z]{3}$")
    limit: int = Field(default=20, ge=1, le=50)
