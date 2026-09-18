"""Persist nearby-airport alternates on searches and tracked routes."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260829_0009"
down_revision: str | None = "20260829_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EMPTY_LIST = sa.text("'[]'")


def upgrade() -> None:
    for table in ("flight_searches", "tracked_routes"):
        op.add_column(
            table,
            sa.Column(
                "origin_alternates",
                postgresql.JSONB(astext_type=sa.Text()),
                server_default=EMPTY_LIST,
                nullable=False,
            ),
        )
        op.add_column(
            table,
            sa.Column(
                "destination_alternates",
                postgresql.JSONB(astext_type=sa.Text()),
                server_default=EMPTY_LIST,
                nullable=False,
            ),
        )


def downgrade() -> None:
    for table in ("flight_searches", "tracked_routes"):
        op.drop_column(table, "destination_alternates")
        op.drop_column(table, "origin_alternates")
