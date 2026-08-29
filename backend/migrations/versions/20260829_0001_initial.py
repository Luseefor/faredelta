"""Create initial FareDelta tables."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260829_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "flight_searches",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("origin", sa.String(length=3), nullable=False),
        sa.Column("destination", sa.String(length=3), nullable=False),
        sa.Column("earliest_departure_date", sa.Date(), nullable=False),
        sa.Column("latest_departure_date", sa.Date(), nullable=False),
        sa.Column("earliest_return_date", sa.Date(), nullable=False),
        sa.Column("latest_return_date", sa.Date(), nullable=False),
        sa.Column("travelers", sa.Integer(), nullable=False),
        sa.Column("cabin_class", sa.String(length=32), nullable=False),
        sa.Column("maximum_stops", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_flight_searches_route_dates",
        "flight_searches",
        ["origin", "destination", "earliest_departure_date"],
    )
    op.create_index("ix_flight_searches_user_id", "flight_searches", ["user_id"])
    op.create_table(
        "flight_offers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("search_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=80), nullable=False),
        sa.Column("airline_code", sa.String(length=3), nullable=False),
        sa.Column("airline_name", sa.String(length=120), nullable=False),
        sa.Column("origin", sa.String(length=3), nullable=False),
        sa.Column("destination", sa.String(length=3), nullable=False),
        sa.Column("departure_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("arrival_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("stops", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("cabin_class", sa.String(length=32), nullable=False),
        sa.Column("booking_url", sa.Text(), nullable=False),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("segments", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(["search_id"], ["flight_searches.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_flight_offers_search_id", "flight_offers", ["search_id"])
    op.create_table(
        "fare_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("offer_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("origin", sa.String(length=3), nullable=False),
        sa.Column("destination", sa.String(length=3), nullable=False),
        sa.Column("departure_date", sa.Date(), nullable=False),
        sa.Column("return_date", sa.Date(), nullable=False),
        sa.Column("airline", sa.String(length=120), nullable=False),
        sa.Column("provider", sa.String(length=80), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("days_until_departure", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["offer_id"], ["flight_offers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_fare_history_route_dates_retrieved",
        "fare_history",
        ["origin", "destination", "departure_date", "return_date", "retrieved_at"],
    )
    op.create_table(
        "tracked_routes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("origin", sa.String(length=3), nullable=False),
        sa.Column("destination", sa.String(length=3), nullable=False),
        sa.Column("earliest_departure_date", sa.Date(), nullable=False),
        sa.Column("latest_departure_date", sa.Date(), nullable=False),
        sa.Column("earliest_return_date", sa.Date(), nullable=False),
        sa.Column("latest_return_date", sa.Date(), nullable=False),
        sa.Column("travelers", sa.Integer(), nullable=False),
        sa.Column("cabin_class", sa.String(length=32), nullable=False),
        sa.Column("maximum_stops", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tracked_routes_user_id", "tracked_routes", ["user_id"])


def downgrade() -> None:
    op.drop_table("tracked_routes")
    op.drop_table("fare_history")
    op.drop_table("flight_offers")
    op.drop_table("flight_searches")
    op.drop_table("users")
