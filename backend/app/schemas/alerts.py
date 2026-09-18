import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_serializer, model_validator


class PriceAlertCreate(BaseModel):
    route_id: uuid.UUID
    target_price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    drop_percent: Decimal | None = Field(default=None, gt=0, le=100, max_digits=5, decimal_places=2)

    @model_validator(mode="after")
    def require_a_threshold(self) -> "PriceAlertCreate":
        if self.target_price is None and self.drop_percent is None:
            raise ValueError("Set a target price, a drop percentage, or both.")
        return self


class PriceAlertUpdate(BaseModel):
    target_price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    drop_percent: Decimal | None = Field(default=None, gt=0, le=100, max_digits=5, decimal_places=2)
    active: bool | None = None

    @model_validator(mode="after")
    def require_a_field(self) -> "PriceAlertUpdate":
        if all(value is None for value in self.model_dump().values()):
            raise ValueError("Provide at least one field to update.")
        return self


class PriceAlertResponse(BaseModel):
    id: uuid.UUID
    route_id: uuid.UUID
    origin: str
    destination: str
    target_price: Decimal | None = None
    drop_percent: Decimal | None = None
    active: bool
    last_notified_price: Decimal | None = None
    created_at: datetime

    @field_serializer("target_price", "drop_percent", "last_notified_price", when_used="json")
    def serialize_optional_price(self, value: Decimal | None) -> float | None:
        return float(value) if value is not None else None


class NotificationResponse(BaseModel):
    id: uuid.UUID
    kind: str
    route_id: uuid.UUID | None
    origin: str | None
    destination: str | None
    price: Decimal
    currency: str
    previous_price: Decimal | None
    read_at: datetime | None
    created_at: datetime

    @field_serializer("price", "previous_price", when_used="json")
    def serialize_price(self, value: Decimal | None) -> float | None:
        return float(value) if value is not None else None


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int = Field(ge=0)


class ReadAllResponse(BaseModel):
    read: int = Field(ge=0)
