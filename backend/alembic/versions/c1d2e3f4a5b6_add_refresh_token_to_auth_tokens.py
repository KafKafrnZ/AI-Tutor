"""add_refresh_token_to_auth_tokens

Revision ID: c1d2e3f4a5b6
Revises: a3f2e1b9c8d7
Create Date: 2026-06-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, None] = "a3f2e1b9c8d7"
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("auth_tokens", sa.Column("refresh_token", sa.String(length=512), nullable=True))
    op.add_column("auth_tokens", sa.Column("refresh_expires_at", sa.DateTime(), nullable=True))
    op.create_index(op.f("ix_auth_tokens_refresh_token"), "auth_tokens", ["refresh_token"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_auth_tokens_refresh_token"), table_name="auth_tokens")
    op.drop_column("auth_tokens", "refresh_expires_at")
    op.drop_column("auth_tokens", "refresh_token")
