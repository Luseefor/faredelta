"""Add password and OAuth fields to users."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260829_0004"
down_revision: str | None = "20260829_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(length=255)))
    op.add_column("users", sa.Column("display_name", sa.String(length=120)))
    op.add_column("users", sa.Column("google_sub", sa.String(length=255)))
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_unique_constraint("uq_users_google_sub", "users", ["google_sub"])


def downgrade() -> None:
    op.drop_constraint("uq_users_google_sub", "users", type_="unique")
    op.drop_column("users", "email_verified")
    op.drop_column("users", "google_sub")
    op.drop_column("users", "display_name")
    op.drop_column("users", "password_hash")
