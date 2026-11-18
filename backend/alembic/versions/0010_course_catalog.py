"""Course outline, skill tags and library links; opportunity skill tags

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-19 14:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '0010'
down_revision: str | None = '0009'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EMPTY = sa.text("'[]'")


def upgrade() -> None:
    with op.batch_alter_table('courses', schema=None) as batch_op:
        batch_op.add_column(sa.Column('outline', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('skills', sa.JSON(), server_default=EMPTY, nullable=False))
        batch_op.add_column(sa.Column('resources', sa.JSON(), server_default=EMPTY, nullable=False))
    with op.batch_alter_table('opportunities', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tags', sa.JSON(), server_default=EMPTY, nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('opportunities', schema=None) as batch_op:
        batch_op.drop_column('tags')
    with op.batch_alter_table('courses', schema=None) as batch_op:
        batch_op.drop_column('resources')
        batch_op.drop_column('skills')
        batch_op.drop_column('outline')
