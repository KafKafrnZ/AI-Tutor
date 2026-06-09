"""add_column_length_limits

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-09 12:21:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "master_questions",
        "question_text",
        existing_type=sa.String(),
        type_=sa.String(length=2000),
        existing_nullable=False,
    )
    op.alter_column(
        "master_questions",
        "option_a",
        existing_type=sa.String(),
        type_=sa.String(length=500),
        existing_nullable=True,
    )
    op.alter_column(
        "master_questions",
        "option_b",
        existing_type=sa.String(),
        type_=sa.String(length=500),
        existing_nullable=True,
    )
    op.alter_column(
        "master_questions",
        "option_c",
        existing_type=sa.String(),
        type_=sa.String(length=500),
        existing_nullable=True,
    )
    op.alter_column(
        "master_questions",
        "option_d",
        existing_type=sa.String(),
        type_=sa.String(length=500),
        existing_nullable=True,
    )
    op.alter_column(
        "master_questions",
        "correct_answer",
        existing_type=sa.String(),
        type_=sa.String(length=10),
        existing_nullable=True,
    )
    op.alter_column(
        "master_questions",
        "explanation",
        existing_type=sa.String(),
        type_=sa.String(length=4000),
        existing_nullable=True,
    )
    op.alter_column(
        "error_logs",
        "question_text",
        existing_type=sa.String(),
        type_=sa.String(length=2000),
        existing_nullable=True,
    )
    op.alter_column(
        "error_logs",
        "user_answer",
        existing_type=sa.String(),
        type_=sa.String(length=500),
        existing_nullable=True,
    )
    op.alter_column(
        "error_logs",
        "correct_answer",
        existing_type=sa.String(),
        type_=sa.String(length=500),
        existing_nullable=True,
    )
    op.alter_column(
        "error_logs",
        "explanation",
        existing_type=sa.String(),
        type_=sa.String(length=2000),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "error_logs",
        "explanation",
        existing_type=sa.String(length=2000),
        type_=sa.String(),
        existing_nullable=True,
    )
    op.alter_column(
        "error_logs",
        "correct_answer",
        existing_type=sa.String(length=500),
        type_=sa.String(),
        existing_nullable=True,
    )
    op.alter_column(
        "error_logs",
        "user_answer",
        existing_type=sa.String(length=500),
        type_=sa.String(),
        existing_nullable=True,
    )
    op.alter_column(
        "error_logs",
        "question_text",
        existing_type=sa.String(length=2000),
        type_=sa.String(),
        existing_nullable=True,
    )
    op.alter_column(
        "master_questions",
        "explanation",
        existing_type=sa.String(length=4000),
        type_=sa.String(),
        existing_nullable=True,
    )
    op.alter_column(
        "master_questions",
        "correct_answer",
        existing_type=sa.String(length=10),
        type_=sa.String(),
        existing_nullable=True,
    )
    op.alter_column(
        "master_questions",
        "option_d",
        existing_type=sa.String(length=500),
        type_=sa.String(),
        existing_nullable=True,
    )
    op.alter_column(
        "master_questions",
        "option_c",
        existing_type=sa.String(length=500),
        type_=sa.String(),
        existing_nullable=True,
    )
    op.alter_column(
        "master_questions",
        "option_b",
        existing_type=sa.String(length=500),
        type_=sa.String(),
        existing_nullable=True,
    )
    op.alter_column(
        "master_questions",
        "option_a",
        existing_type=sa.String(length=500),
        type_=sa.String(),
        existing_nullable=True,
    )
    op.alter_column(
        "master_questions",
        "question_text",
        existing_type=sa.String(length=2000),
        type_=sa.String(),
        existing_nullable=False,
    )