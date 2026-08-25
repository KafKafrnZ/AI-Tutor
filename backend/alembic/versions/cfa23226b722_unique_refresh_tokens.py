"""unique_refresh_tokens

Revision ID: cfa23226b722
Revises: e5f6a7b8c9d0
Create Date: 2026-08-25 15:58:15.748772

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cfa23226b722'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_auth_tokens_refresh_token")
        op.execute(
            "CREATE UNIQUE INDEX ix_auth_tokens_refresh_token_unique "
            "ON auth_tokens (refresh_token) WHERE refresh_token IS NOT NULL"
        )
    else:
        with op.batch_alter_table("auth_tokens") as batch_op:
            batch_op.create_unique_constraint("uq_auth_tokens_refresh_token", ["refresh_token"])

def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.execute("DROP INDEX ix_auth_tokens_refresh_token_unique")
    else:
        with op.batch_alter_table("auth_tokens") as batch_op:
            batch_op.drop_constraint("uq_auth_tokens_refresh_token", type_="unique")