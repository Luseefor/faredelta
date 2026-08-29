import re
import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, Field, HttpUrl, field_serializer, field_validator, model_validator

IATA_PATTERN = re.compile(r"^[A-Z]{3}$")


class CabinClass(StrEnum):
    economy = "economy"
    premium_economy = "premium_economy"
    business = "business"
    first = "first"


class Airport(BaseModel):
    code: str
    name: str | None = None


class Airline(BaseModel):
    code: str
    name: str


class FlightSegment(BaseModel):
    airline: Airline
    flight_number: str
    origin: Airport
    destination: Airport
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int = Field(gt=0)


class FlightOffer(BaseModel):
    id: uuid.UUID
    provider: str
    airline: Airline
    origin: Airport
    destination: Airport
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int = Field(gt=0)
    stops: int = Field(ge=0, le=2)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    cabin_class: CabinClass
    booking_url: HttpUrl
    retrieved_at: datetime
    segments: list[FlightSegment] = Field(min_length=1)
    return_date: date

    @field_serializer("price", when_used="json")
    def serialize_price(self, value: Decimal) -> float:
        return float(value)


class FlightSearchRequest(BaseModel):
    origin: str
    destination: str
    earliest_departure_date: date
    latest_departure_date: date
    earliest_return_date: date
    latest_return_date: date
    travelers: int = Field(ge=1, le=9)
    cabin_class: CabinClass
    maximum_stops: int = Field(ge=0, le=2)

    @field_validator("origin", "destination", mode="before")
    @classmethod
    def normalize_airport(cls, value: object) -> str:
        code = str(value).strip().upper()
        if not IATA_PATTERN.fullmatch(code):
            raise ValueError("must be a three-letter IATA airport code")
        return code

    @model_validator(mode="after")
    def validate_route_and_dates(self) -> "FlightSearchRequest":
        if self.origin == self.destination:
            raise ValueError("origin and destination must be different")
        if self.earliest_departure_date > self.latest_departure_date:
            raise ValueError("earliest departure date must not be after latest departure date")
        if self.earliest_return_date > self.latest_return_date:
            raise ValueError("earliest return date must not be after latest return date")
        if self.earliest_return_date <= self.earliest_departure_date:
            raise ValueError("return dates must begin after the earliest departure date")
        if self.latest_return_date <= self.latest_departure_date:
            raise ValueError("latest return date must be after the latest departure date")
        return self


class FlightSearchResponse(BaseModel):
    search_id: uuid.UUID
    providers: list[str]
    result_count: int
    retrieved_at: datetime
    offers: list[FlightOffer]


class FareHistoryPoint(BaseModel):
    retrieved_at: datetime
    lowest_price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    offers_sampled: int = Field(gt=0)

    @field_serializer("lowest_price", when_used="json")
    def serialize_price(self, value: Decimal) -> float:
        return float(value)


class FareHistoryResponse(BaseModel):
    origin: str
    destination: str
    departure_date: date | None = None
    return_date: date | None = None
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    point_count: int = Field(ge=0)
    current_price: Decimal | None = None
    lowest_price: Decimal | None = None
    highest_price: Decimal | None = None
    points: list[FareHistoryPoint]

    @field_serializer("current_price", "lowest_price", "highest_price", when_used="json")
    def serialize_optional_price(self, value: Decimal | None) -> float | None:
        return float(value) if value is not None else None
