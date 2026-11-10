"""Phase 4 tables: Project Lab challenges, Study Planner tasks, MindCare support directory and requests.

MindCare tables (support_resources, support_requests, plus mood_checkins in activity.py) are never read by
academic or dashboard code.
"""

import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Index, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin
from app.models.enums import (
    EducationLevel,
    SupportRequestStatus,
    SupportResourceKind,
    SupportTopic,
    TaskStatus,
    VerificationStatus,
    str_enum,
)

# ---------- Project Lab ----------


class ProjectChallenge(IdMixin, TimestampMixin, Base):
    """A guided project brief. Students build in Colab/GitHub (no code runs on our servers)."""

    __tablename__ = "project_challenges"
    __table_args__ = (Index("ix_project_challenges_level_published", "level", "is_published"),)

    title: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    level: Mapped[EducationLevel] = mapped_column(str_enum(EducationLevel, "challenge_level"))
    summary: Mapped[str] = mapped_column(Text)
    brief_md: Mapped[str] = mapped_column(Text)
    skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    estimated_hours: Mapped[int] = mapped_column(SmallInteger, default=2)
    starter_url: Mapped[str | None] = mapped_column(String(500))
    order_index: Mapped[int] = mapped_column(SmallInteger, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)


# ---------- Study Planner ----------


class StudyTask(IdMixin, TimestampMixin, Base):
    __tablename__ = "study_tasks"
    __table_args__ = (Index("ix_study_tasks_user_due", "user_id", "due_on"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    due_on: Mapped[date] = mapped_column(Date)
    planned_minutes: Mapped[int] = mapped_column(SmallInteger, default=30)
    status: Mapped[TaskStatus] = mapped_column(str_enum(TaskStatus, "task_status"), default=TaskStatus.todo)
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("lessons.id", ondelete="SET NULL"))
    notes: Mapped[str | None] = mapped_column(Text)


# ---------- MindCare ----------


class SupportResource(IdMixin, TimestampMixin, Base):
    """Counsellors and helplines. Added and verified by admins; students only see verified entries."""

    __tablename__ = "support_resources"

    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[SupportResourceKind] = mapped_column(str_enum(SupportResourceKind, "support_resource_kind"))
    description: Mapped[str] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(40))
    url: Mapped[str | None] = mapped_column(String(500))
    hours: Mapped[str | None] = mapped_column(String(120))
    languages: Mapped[list[str]] = mapped_column(JSON, default=list)
    cost_note: Mapped[str | None] = mapped_column(String(200))
    verification_status: Mapped[VerificationStatus] = mapped_column(
        str_enum(VerificationStatus, "support_resource_verification"), default=VerificationStatus.unverified, index=True
    )
    verified_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_note: Mapped[str | None] = mapped_column(Text)


class SupportRequest(IdMixin, TimestampMixin, Base):
    """A student asking a person for help. The message and phone are encrypted at rest."""

    __tablename__ = "support_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    topic: Mapped[SupportTopic] = mapped_column(str_enum(SupportTopic, "support_topic"))
    message_enc: Mapped[str] = mapped_column(Text)
    preferred_contact: Mapped[str] = mapped_column(String(10))  # "email" | "phone"
    phone_enc: Mapped[str | None] = mapped_column(Text)
    status: Mapped[SupportRequestStatus] = mapped_column(
        str_enum(SupportRequestStatus, "support_request_status"), default=SupportRequestStatus.open, index=True
    )
    handled_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    handled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
