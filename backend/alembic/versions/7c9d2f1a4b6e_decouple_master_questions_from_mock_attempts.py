"""decouple master questions from mock attempts

Revision ID: 7c9d2f1a4b6e
Revises: 2641f075abc6
Create Date: 2026-06-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "7c9d2f1a4b6e"
down_revision: Union[str, None] = "2641f075abc6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "fk_master_questions_test_id_mock_tests",
        "master_questions",
        type_="foreignkey",
    )


def downgrade() -> None:
    op.create_foreign_key(
        "fk_master_questions_test_id_mock_tests",
        "master_questions",
        "mock_tests",
        ["test_id"],
        ["id"],
        ondelete="CASCADE",
    )
