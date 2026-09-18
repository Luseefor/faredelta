"""Add refresh scheduling to tracked routes."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260829_0008"
down_revision: str | None = "20260829_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tracked_routes",
        sa.Column(
            "refresh_cadence_hours", sa.Integer(), server_default="24", nullable=False
        ),
    )
    op.add_column("tracked_routes", sa.Column("next_refresh_at", sa.DateTime(timezone=True)))
    op.add_column(
        "tracked_routes",
        sa.Column("consecutive_failures", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_index(
        "ix_tracked_routes_next_refresh_at", "tracked_routes", ["next_refresh_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_tracked_routes_next_refresh_at", table_name="tracked_routes")
    op.drop_column("tracked_routes", "consecutive_failures")
    op.drop_column("tracked_routes", "next_refresh_at")
    op.drop_column("tracked_routes", "refresh_cadence_hours")
