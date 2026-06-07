"""add error_logs table

Revision ID: b3e1f2a9c4d7
Revises: 7c9d2f1a4b6e
Create Date: 2026-06-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b3e1f2a9c4d7"
down_revision: Union[str, None] = "7c9d2f1a4b6e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "error_logs" not in inspector.get_table_names():
        op.create_table(
            "error_logs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("question_text", sa.String(), nullable=True),
            sa.Column("user_answer", sa.String(), nullable=True),
            sa.Column("correct_answer", sa.String(), nullable=True),
            sa.Column("explanation", sa.String(), nullable=True),
            sa.Column("date_added", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_error_logs_id", "error_logs", ["id"], unique=False)
        op.create_index("ix_error_logs_user_id", "error_logs", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_error_logs_user_id", table_name="error_logs")
    op.drop_index("ix_error_logs_id", table_name="error_logs")
    op.drop_table("error_logs")
