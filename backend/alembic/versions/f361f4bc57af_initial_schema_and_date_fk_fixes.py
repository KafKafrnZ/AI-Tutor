"""initial_schema_and_date_fk_fixes

Revision ID: f361f4bc57af
Revises:
Create Date: 2026-06-01 16:46:04.964735

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f361f4bc57af"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("plan", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    op.create_table(
        "mock_tests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("date", sa.Date(), nullable=True),
        sa.Column("test_name", sa.String(), nullable=True),
        sa.Column("section", sa.String(), nullable=True),
        sa.Column("attempted", sa.Integer(), nullable=True),
        sa.Column("correct", sa.Integer(), nullable=True),
        sa.Column("time_taken", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_mock_tests_id"), "mock_tests", ["id"], unique=False)

    op.create_table(
        "master_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("test_id", sa.Integer(), nullable=True),
        sa.Column("section", sa.String(), nullable=True),
        sa.Column("topic", sa.String(), nullable=True),
        sa.Column("question_text", sa.String(), nullable=False),
        sa.Column("option_a", sa.String(), nullable=True),
        sa.Column("option_b", sa.String(), nullable=True),
        sa.Column("option_c", sa.String(), nullable=True),
        sa.Column("option_d", sa.String(), nullable=True),
        sa.Column("correct_answer", sa.String(), nullable=True),
        sa.Column("explanation", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_master_questions_id"), "master_questions", ["id"], unique=False)
    op.create_index(op.f("ix_master_questions_test_id"), "master_questions", ["test_id"], unique=False)

    op.create_table(
        "error_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("question_text", sa.String(), nullable=True),
        sa.Column("user_answer", sa.String(), nullable=True),
        sa.Column("correct_answer", sa.String(), nullable=True),
        sa.Column("explanation", sa.String(), nullable=True),
        sa.Column("date_added", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_error_logs_id"), "error_logs", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_error_logs_id"), table_name="error_logs")
    op.drop_table("error_logs")
    op.drop_index(op.f("ix_master_questions_test_id"), table_name="master_questions")
    op.drop_index(op.f("ix_master_questions_id"), table_name="master_questions")
    op.drop_table("master_questions")
    op.drop_index(op.f("ix_mock_tests_id"), table_name="mock_tests")
    op.drop_table("mock_tests")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
