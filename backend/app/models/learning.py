import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Index, Integer, SmallInteger, String, Text, UniqueConstraint, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin
from app.models.enums import EducationLevel, ProgressStatus, str_enum


class Course(IdMixin, TimestampMixin, Base):
    __tablename__ = "courses"
    __table_args__ = (Index("ix_courses_level_published", "level", "is_published"),)

    title: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    level: Mapped[EducationLevel] = mapped_column(str_enum(EducationLevel, "course_level"))
    category: Mapped[str] = mapped_column(String(60), default="ai")
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)  # seeded demo content is labelled
    estimated_hours: Mapped[float] = mapped_column(Float, default=1.0)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    lessons: Mapped[list["Lesson"]] = relationship(back_populates="course", order_by="Lesson.order_index", cascade="all, delete-orphan")


class Lesson(IdMixin, TimestampMixin, Base):
    __tablename__ = "lessons"
    __table_args__ = (Index("ix_lessons_course_order", "course_id", "order_index"),)

    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    content_md: Mapped[str] = mapped_column(Text, default="")
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    duration_min: Mapped[int] = mapped_column(Integer, default=10)
    colab_url: Mapped[str | None] = mapped_column(String(500))

    course: Mapped[Course] = relationship(back_populates="lessons")


class Assessment(IdMixin, TimestampMixin, Base):
    __tablename__ = "assessments"

    title: Mapped[str] = mapped_column(String(200))
    topic: Mapped[str] = mapped_column(String(100))
    level: Mapped[EducationLevel | None] = mapped_column(str_enum(EducationLevel, "assessment_level"))
    course_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"))
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    time_limit_min: Mapped[int | None] = mapped_column(Integer)
    is_placement: Mapped[bool] = mapped_column(Boolean, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())

    questions: Mapped[list["AssessmentQuestion"]] = relationship(
        back_populates="assessment", order_by="AssessmentQuestion.order_index", cascade="all, delete-orphan"
    )


class AssessmentQuestion(IdMixin, TimestampMixin, Base):
    __tablename__ = "assessment_questions"

    assessment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assessments.id", ondelete="CASCADE"), index=True)
    prompt: Mapped[str] = mapped_column(Text)
    options: Mapped[list[str]] = mapped_column(JSON)
    correct_option: Mapped[int] = mapped_column(SmallInteger)  # answer key — never serialised to students
    explanation: Mapped[str | None] = mapped_column(Text)
    topic_tag: Mapped[str] = mapped_column(String(60), default="general")
    difficulty: Mapped[int] = mapped_column(SmallInteger, default=1)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    assessment: Mapped[Assessment] = relationship(back_populates="questions")


class AssessmentResult(IdMixin, TimestampMixin, Base):
    __tablename__ = "assessment_results"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    assessment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assessments.id", ondelete="CASCADE"), index=True)
    score: Mapped[int] = mapped_column(Integer)
    max_score: Mapped[int] = mapped_column(Integer)
    answers: Mapped[dict] = mapped_column(JSON, default=dict)
    topic_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    recommended_level: Mapped[EducationLevel | None] = mapped_column(str_enum(EducationLevel, "result_level"))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LearningProgress(IdMixin, TimestampMixin, Base):
    __tablename__ = "learning_progress"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id", name="uq_learning_progress_user_lesson"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"))
    status: Mapped[ProgressStatus] = mapped_column(str_enum(ProgressStatus, "progress_status"), default=ProgressStatus.not_started)
    percent: Mapped[int] = mapped_column(SmallInteger, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
