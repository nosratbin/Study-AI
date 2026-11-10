"""phase 4: project challenges, study tasks, MindCare support directory/requests, passport share token

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-11 02:35:13.490438
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '0005'
down_revision: str | None = '0004'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:

    op.create_table('project_challenges',
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('slug', sa.String(length=120), nullable=False),
    sa.Column('level', sa.Enum('school', 'college', 'university', name='challenge_level', native_enum=False, create_constraint=True, length=32), nullable=False),
    sa.Column('summary', sa.Text(), nullable=False),
    sa.Column('brief_md', sa.Text(), nullable=False),
    sa.Column('skills', sa.JSON(), nullable=False),
    sa.Column('estimated_hours', sa.SmallInteger(), nullable=False),
    sa.Column('starter_url', sa.String(length=500), nullable=True),
    sa.Column('order_index', sa.SmallInteger(), nullable=False),
    sa.Column('is_published', sa.Boolean(), nullable=False),
    sa.Column('is_demo', sa.Boolean(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_project_challenges')),
    sa.UniqueConstraint('slug', name=op.f('uq_project_challenges_slug'))
    )
    with op.batch_alter_table('project_challenges', schema=None) as batch_op:
        batch_op.create_index('ix_project_challenges_level_published', ['level', 'is_published'], unique=False)

    op.create_table('support_requests',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('topic', sa.Enum('stress', 'study_pressure', 'relationships', 'feeling_low', 'other', name='support_topic', native_enum=False, create_constraint=True, length=32), nullable=False),
    sa.Column('message_enc', sa.Text(), nullable=False),
    sa.Column('preferred_contact', sa.String(length=10), nullable=False),
    sa.Column('phone_enc', sa.Text(), nullable=True),
    sa.Column('status', sa.Enum('open', 'in_progress', 'closed', name='support_request_status', native_enum=False, create_constraint=True, length=32), nullable=False),
    sa.Column('handled_by', sa.Uuid(), nullable=True),
    sa.Column('handled_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['handled_by'], ['users.id'], name=op.f('fk_support_requests_handled_by_users'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_support_requests_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_support_requests'))
    )
    with op.batch_alter_table('support_requests', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_support_requests_status'), ['status'], unique=False)
        batch_op.create_index(batch_op.f('ix_support_requests_user_id'), ['user_id'], unique=False)

    op.create_table('support_resources',
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('kind', sa.Enum('helpline', 'counsellor', 'organisation', name='support_resource_kind', native_enum=False, create_constraint=True, length=32), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('phone', sa.String(length=40), nullable=True),
    sa.Column('url', sa.String(length=500), nullable=True),
    sa.Column('hours', sa.String(length=120), nullable=True),
    sa.Column('languages', sa.JSON(), nullable=False),
    sa.Column('cost_note', sa.String(length=200), nullable=True),
    sa.Column('verification_status', sa.Enum('unverified', 'verified', 'rejected', name='support_resource_verification', native_enum=False, create_constraint=True, length=32), nullable=False),
    sa.Column('verified_by', sa.Uuid(), nullable=True),
    sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('source_note', sa.Text(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['verified_by'], ['users.id'], name=op.f('fk_support_resources_verified_by_users'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_support_resources'))
    )
    with op.batch_alter_table('support_resources', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_support_resources_verification_status'), ['verification_status'], unique=False)

    op.create_table('study_tasks',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('due_on', sa.Date(), nullable=False),
    sa.Column('planned_minutes', sa.SmallInteger(), nullable=False),
    sa.Column('status', sa.Enum('todo', 'done', name='task_status', native_enum=False, create_constraint=True, length=32), nullable=False),
    sa.Column('done_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('lesson_id', sa.Uuid(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], name=op.f('fk_study_tasks_lesson_id_lessons'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_study_tasks_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_study_tasks'))
    )
    with op.batch_alter_table('study_tasks', schema=None) as batch_op:
        batch_op.create_index('ix_study_tasks_user_due', ['user_id', 'due_on'], unique=False)

    with op.batch_alter_table('certificates', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_certificates_user_course', ['user_id', 'course_id'])

    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('challenge_id', sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column('documentation', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.create_index(batch_op.f('ix_projects_challenge_id'), ['challenge_id'], unique=False)
        batch_op.create_foreign_key(batch_op.f('fk_projects_challenge_id_project_challenges'), 'project_challenges', ['challenge_id'], ['id'], ondelete='SET NULL')

    with op.batch_alter_table('skill_records', schema=None) as batch_op:
        batch_op.add_column(sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('review_note', sa.Text(), nullable=True))

    with op.batch_alter_table('student_profiles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('passport_token', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('passport_shared_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.create_unique_constraint(batch_op.f('uq_student_profiles_passport_token'), ['passport_token'])




def downgrade() -> None:

    with op.batch_alter_table('student_profiles', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('uq_student_profiles_passport_token'), type_='unique')
        batch_op.drop_column('passport_shared_at')
        batch_op.drop_column('passport_token')

    with op.batch_alter_table('skill_records', schema=None) as batch_op:
        batch_op.drop_column('review_note')
        batch_op.drop_column('verified_at')

    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_projects_challenge_id_project_challenges'), type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_projects_challenge_id'))
        batch_op.drop_column('reviewed_at')
        batch_op.drop_column('submitted_at')
        batch_op.drop_column('documentation')
        batch_op.drop_column('challenge_id')

    with op.batch_alter_table('certificates', schema=None) as batch_op:
        batch_op.drop_constraint('uq_certificates_user_course', type_='unique')

    with op.batch_alter_table('study_tasks', schema=None) as batch_op:
        batch_op.drop_index('ix_study_tasks_user_due')

    op.drop_table('study_tasks')
    with op.batch_alter_table('support_resources', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_support_resources_verification_status'))

    op.drop_table('support_resources')
    with op.batch_alter_table('support_requests', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_support_requests_user_id'))
        batch_op.drop_index(batch_op.f('ix_support_requests_status'))

    op.drop_table('support_requests')
    with op.batch_alter_table('project_challenges', schema=None) as batch_op:
        batch_op.drop_index('ix_project_challenges_level_published')

    op.drop_table('project_challenges')

