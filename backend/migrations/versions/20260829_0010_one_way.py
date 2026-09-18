"""Support one-way searches: trip type plus nullable return dates."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260829_0010"
down_revision: str | None = "20260829_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for table in ("flight_searches", "tracked_routes"):
        op.add_column(
            table,
            sa.Column(
                "trip_type",
                sa.String(length=16),
                server_default="round_trip",
                nullable=False,
            ),
        )
        op.alter_column(table, "earliest_return_date", existing_type=sa.Date(), nullable=True)
        op.alter_column(table, "latest_return_date", existing_type=sa.Date(), nullable=True)
    op.alter_column("fare_history", "return_date", existing_type=sa.Date(), nullable=True)


def downgrade() -> None:
    op.alter_column("fare_history", "return_date", existing_type=sa.Date(), nullable=False)
    for table in ("flight_searches", "tracked_routes"):
        op.alter_column(table, "latest_return_date", existing_type=sa.Date(), nullable=False)
        op.alter_column(table, "earliest_return_date", existing_type=sa.Date(), nullable=False)
        op.drop_column(table, "trip_type")
