import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str | None] = mapped_column(String(320), unique=True, nullable=True)


class FlightSearch(TimestampMixin, Base):
    __tablename__ = "flight_searches"
    __table_args__ = (
        Index("ix_flight_searches_route_dates", "origin", "destination", "earliest_departure_date"),
        Index("ix_flight_searches_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    origin: Mapped[str] = mapped_column(String(3), nullable=False)
    destination: Mapped[str] = mapped_column(String(3), nullable=False)
    earliest_departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    latest_departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    earliest_return_date: Mapped[date] = mapped_column(Date, nullable=False)
    latest_return_date: Mapped[date] = mapped_column(Date, nullable=False)
    travelers: Mapped[int] = mapped_column(Integer, nullable=False)
    cabin_class: Mapped[str] = mapped_column(String(32), nullable=False)
    maximum_stops: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")

    offers: Mapped[list["FlightOfferRecord"]] = relationship(
        back_populates="search", cascade="all, delete-orphan"
    )


class FlightOfferRecord(Base):
    __tablename__ = "flight_offers"
    __table_args__ = (Index("ix_flight_offers_search_id", "search_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    search_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("flight_searches.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    airline_code: Mapped[str] = mapped_column(String(3), nullable=False)
    airline_name: Mapped[str] = mapped_column(String(120), nullable=False)
    origin: Mapped[str] = mapped_column(String(3), nullable=False)
    destination: Mapped[str] = mapped_column(String(3), nullable=False)
    departure_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    arrival_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    stops: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    cabin_class: Mapped[str] = mapped_column(String(32), nullable=False)
    booking_url: Mapped[str] = mapped_column(Text, nullable=False)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    segments: Mapped[list[dict[str, object]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), nullable=False
    )

    search: Mapped[FlightSearch] = relationship(back_populates="offers")


class FareHistory(Base):
    __tablename__ = "fare_history"
    __table_args__ = (
        Index(
            "ix_fare_history_route_dates_retrieved",
            "origin",
            "destination",
            "departure_date",
            "return_date",
            "retrieved_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offer_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("flight_offers.id"), nullable=True
    )
    origin: Mapped[str] = mapped_column(String(3), nullable=False)
    destination: Mapped[str] = mapped_column(String(3), nullable=False)
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_date: Mapped[date] = mapped_column(Date, nullable=False)
    airline: Mapped[str] = mapped_column(String(120), nullable=False)
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    days_until_departure: Mapped[int] = mapped_column(Integer, nullable=False)


class TrackedRoute(TimestampMixin, Base):
    __tablename__ = "tracked_routes"
    __table_args__ = (
        Index("ix_tracked_routes_user_id", "user_id"),
        Index("ix_tracked_routes_anonymous_id", "anonymous_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    anonymous_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    origin: Mapped[str] = mapped_column(String(3), nullable=False)
    destination: Mapped[str] = mapped_column(String(3), nullable=False)
    earliest_departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    latest_departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    earliest_return_date: Mapped[date] = mapped_column(Date, nullable=False)
    latest_return_date: Mapped[date] = mapped_column(Date, nullable=False)
    travelers: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    cabin_class: Mapped[str] = mapped_column(String(32), nullable=False, default="economy")
    maximum_stops: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    active: Mapped[bool] = mapped_column(nullable=False, default=True)
    previous_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    last_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
