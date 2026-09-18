"""Map users to Clerk identities; drop local password storage."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260829_0005"
down_revision: str | None = "20260829_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("clerk_user_id", sa.String(length=64)))
    op.create_unique_constraint("uq_users_clerk_user_id", "users", ["clerk_user_id"])
    op.drop_column("users", "password_hash")


def downgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(length=255)))
    op.drop_constraint("uq_users_clerk_user_id", "users", type_="unique")
    op.drop_column("users", "clerk_user_id")
