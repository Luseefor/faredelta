"""Add anonymous ownership to tracked routes."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260829_0002"
down_revision: str | None = "20260829_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tracked_routes",
        sa.Column("anonymous_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_tracked_routes_anonymous_id", "tracked_routes", ["anonymous_id"])


def downgrade() -> None:
    op.drop_index("ix_tracked_routes_anonymous_id", table_name="tracked_routes")
    op.drop_column("tracked_routes", "anonymous_id")
