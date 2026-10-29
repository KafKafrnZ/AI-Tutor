"""add razorpay ids to users

Revision ID: a1b2c3d4e5f6
Revises: cfa23226b722
Create Date: 2026-09-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "cfa23226b722"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("razorpay_customer_id", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("razorpay_subscription_id", sa.String(length=64), nullable=True))
    op.create_index("ix_users_razorpay_subscription_id", "users", ["razorpay_subscription_id"])


def downgrade() -> None:
    op.drop_index("ix_users_razorpay_subscription_id", table_name="users")
    op.drop_column("users", "razorpay_subscription_id")
    op.drop_column("users", "razorpay_customer_id")
