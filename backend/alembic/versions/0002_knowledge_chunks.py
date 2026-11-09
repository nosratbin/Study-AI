"""knowledge chunks for RAG (pgvector on PostgreSQL)

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-10
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DIM = 768  # must match settings.embedding_dim


def upgrade() -> None:
    bind = op.get_bind()
    is_pg = bind.dialect.name == "postgresql"
    if is_pg:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        from pgvector.sqlalchemy import Vector

        embedding_type = Vector(DIM)
    else:
        embedding_type = sa.JSON()

    op.create_table(
        "knowledge_chunks",
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("source_id", sa.String(length=64), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=250), nullable=False),
        sa.Column("level", sa.Enum("school", "college", "university", name="chunk_level", native_enum=False,
                                   create_constraint=True, length=32), nullable=True),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("embedding", embedding_type, nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], name=op.f("fk_knowledge_chunks_course_id_courses"),
                                ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_knowledge_chunks")),
    )
    op.create_index("ix_knowledge_chunks_source", "knowledge_chunks", ["source_type", "source_id"])
    if is_pg:
        op.execute(
            "CREATE INDEX ix_knowledge_chunks_embedding ON knowledge_chunks "
            "USING hnsw (embedding vector_cosine_ops)"
        )


    with op.batch_alter_table("assessments") as batch:
        batch.add_column(sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("assessments") as batch:
        batch.drop_column("is_demo")
    op.drop_table("knowledge_chunks")
