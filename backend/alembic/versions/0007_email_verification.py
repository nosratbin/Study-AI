"""email verification: users.email_verified_at and email_verifications

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-17 12:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '0007'
down_revision: str | None = '0006'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True))
    # Accounts created before verification existed keep working: treat them as verified.
    op.execute("UPDATE users SET email_verified_at = created_at")

    op.create_table('email_verifications',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('code_hash', sa.String(length=64), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('attempts', sa.Integer(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_email_verifications_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_email_verifications')),
    sa.UniqueConstraint('user_id', name=op.f('uq_email_verifications_user_id'))
    )
    with op.batch_alter_table('email_verifications', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_email_verifications_token_hash'), ['token_hash'], unique=True)


def downgrade() -> None:
    with op.batch_alter_table('email_verifications', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_email_verifications_token_hash'))
    op.drop_table('email_verifications')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('email_verified_at')
