"""Phase 5: Career Navigator.

Careers are curated by staff (seeded demo careers are flagged `is_demo`). Matching is rule-based; the LLM only
writes an optional study plan and never invents salaries, admission data or deadlines.
"""

import uuid

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin


class Career(IdMixin, TimestampMixin, Base):
    __tablename__ = "careers"

    slug: Mapped[str] = mapped_column(String(120), unique=True)
    title: Mapped[str] = mapped_column(String(160))
    field: Mapped[str] = mapped_column(String(80))  # e.g. "Technology", "Design"
    summary: Mapped[str] = mapped_column(String(400))
    description_md: Mapped[str] = mapped_column(Text, default="")
    # Lower-case tags compared with student interests, course categories and assessment topics.
    interests: Mapped[list[str]] = mapped_column(JSON, default=list)
    # Key skills: [{"name": "Python programming", "tags": ["python", "programming"]}]. A student "has" a skill when a
    # tag matches their evidence: a completed course (slug/category), a strong assessment topic, or an achievement title.
    skills: Mapped[list[dict]] = mapped_column(JSON, default=list)
    education_paths: Mapped[list[str]] = mapped_column(JSON, default=list)
    course_slugs: Mapped[list[str]] = mapped_column(JSON, default=list)  # IccheGhuri courses that build these skills
    opportunity_categories: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0)


class CareerGoal(IdMixin, TimestampMixin, Base):
    """A career a student has saved as a goal (at most a few per student)."""

    __tablename__ = "career_goals"
    __table_args__ = (UniqueConstraint("user_id", "career_id", name="uq_career_goals_user_career"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    career_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("careers.id", ondelete="CASCADE"), index=True)
    note: Mapped[str | None] = mapped_column(Text)
