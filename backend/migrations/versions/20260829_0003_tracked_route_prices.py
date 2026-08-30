"""Add refresh state to tracked routes."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260829_0003"
down_revision: str | None = "20260829_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tracked_routes", sa.Column("previous_price", sa.Numeric(10, 2)))
    op.add_column("tracked_routes", sa.Column("last_price", sa.Numeric(10, 2)))
    op.add_column("tracked_routes", sa.Column("currency", sa.String(length=3)))
    op.add_column("tracked_routes", sa.Column("last_checked_at", sa.DateTime(timezone=True)))


def downgrade() -> None:
    op.drop_column("tracked_routes", "last_checked_at")
    op.drop_column("tracked_routes", "currency")
    op.drop_column("tracked_routes", "last_price")
    op.drop_column("tracked_routes", "previous_price")
