import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin
from app.models.enums import EducationLevel, Language, Role, str_enum


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(100))  # null for Google-only accounts
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[Role] = mapped_column(str_enum(Role, "user_role"), default=Role.student, index=True)
    firebase_uid: Mapped[str | None] = mapped_column(String(128), unique=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    token_version: Mapped[int] = mapped_column(Integer, default=0)  # bump to revoke all sessions
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    student_profile: Mapped["StudentProfile | None"] = relationship(back_populates="user", uselist=False)
    teacher_profile: Mapped["TeacherProfile | None"] = relationship(back_populates="user", uselist=False)


class StudentProfile(IdMixin, TimestampMixin, Base):
    __tablename__ = "student_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    education_level: Mapped[EducationLevel | None] = mapped_column(str_enum(EducationLevel, "student_level"))
    institution: Mapped[str | None] = mapped_column(String(200))
    class_or_year: Mapped[str | None] = mapped_column(String(50))
    district: Mapped[str | None] = mapped_column(String(80))
    # Only the birth year is stored (minimum PII) — enough to apply minor protections.
    birth_year: Mapped[int | None] = mapped_column(SmallInteger)
    is_minor: Mapped[bool] = mapped_column(Boolean, default=False)
    guardian_consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    preferred_language: Mapped[Language] = mapped_column(str_enum(Language, "student_language"), default=Language.en)
    interests: Mapped[list[str]] = mapped_column(JSON, default=list)
    goals: Mapped[str | None] = mapped_column(Text)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    recommended_level: Mapped[EducationLevel | None] = mapped_column(str_enum(EducationLevel, "student_reco_level"))

    user: Mapped[User] = relationship(back_populates="student_profile")


class TeacherProfile(IdMixin, TimestampMixin, Base):
    __tablename__ = "teacher_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    institution: Mapped[str | None] = mapped_column(String(200))
    expertise: Mapped[list[str]] = mapped_column(JSON, default=list)
    bio: Mapped[str | None] = mapped_column(Text)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="teacher_profile")
