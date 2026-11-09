"""RAG knowledge base. Embeddings use pgvector on PostgreSQL and JSON on SQLite (tests)."""

import uuid

from sqlalchemy import JSON, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import TypeDecorator

from app.core.config import get_settings
from app.db.base import Base, IdMixin, TimestampMixin
from app.models.enums import EducationLevel, str_enum


class Embedding(TypeDecorator):
    """vector(N) on Postgres, JSON list elsewhere."""

    impl = JSON
    cache_ok = True

    def __init__(self, dim: int):
        super().__init__()
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from pgvector.sqlalchemy import Vector

            return dialect.type_descriptor(Vector(self.dim))
        return dialect.type_descriptor(JSON())

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return [float(x) for x in value]


class KnowledgeChunk(IdMixin, TimestampMixin, Base):
    __tablename__ = "knowledge_chunks"
    __table_args__ = (
        Index("ix_knowledge_chunks_source", "source_type", "source_id"),
        # HNSW index is created by migration 0002 (PostgreSQL only); alembic/env.py skips it in autogenerate.
    )

    source_type: Mapped[str] = mapped_column(String(30))  # "lesson" | "document"
    source_id: Mapped[str] = mapped_column(String(64))
    course_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(250))
    level: Mapped[EducationLevel | None] = mapped_column(str_enum(EducationLevel, "chunk_level"))
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    content: Mapped[str] = mapped_column(Text)
    content_hash: Mapped[str] = mapped_column(String(64))  # skip re-embedding unchanged content
    embedding: Mapped[list[float] | None] = mapped_column(Embedding(get_settings().embedding_dim))
