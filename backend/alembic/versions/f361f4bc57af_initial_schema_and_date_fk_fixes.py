"""initial_schema_and_date_fk_fixes

Revision ID: f361f4bc57af
Revises: 
Create Date: 2026-06-01 16:46:04.964735

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f361f4bc57af'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    # 1. Add explicitly named foreign key
    op.create_foreign_key(
        "fk_master_questions_test_id_mock_tests",
        "master_questions",
        "mock_tests",
        ["test_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 2. Safely cast date
    op.alter_column('mock_tests', 'date',
        existing_type=sa.VARCHAR(),
        type_=sa.Date(),
        existing_nullable=True,
        postgresql_using='date::date'
    )

    # 3. Safely cast attempted
    op.alter_column('mock_tests', 'attempted',
        existing_type=sa.VARCHAR(),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using='attempted::integer'
    )

    # 4. Safely cast correct
    op.alter_column('mock_tests', 'correct',
        existing_type=sa.VARCHAR(),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using='correct::integer'
    )


def downgrade() -> None:
    # 1. Revert correct back to VARCHAR
    op.alter_column('mock_tests', 'correct',
        existing_type=sa.Integer(),
        type_=sa.VARCHAR(),
        existing_nullable=True
    )

    # 2. Revert attempted back to VARCHAR
    op.alter_column('mock_tests', 'attempted',
        existing_type=sa.Integer(),
        type_=sa.VARCHAR(),
        existing_nullable=True
    )

    # 3. Revert date back to VARCHAR
    op.alter_column('mock_tests', 'date',
        existing_type=sa.Date(),
        type_=sa.VARCHAR(),
        existing_nullable=True
    )

    # 4. Drop the foreign key using the explicit name we created in upgrade()
    op.drop_constraint(
        "fk_master_questions_test_id_mock_tests", 
        "master_questions", 
        type_="foreignkey"
    )


