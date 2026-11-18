import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, Text, false
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
    # Set once the student proves they own the address (email code/link, or Google). Password sign-in needs it.
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Guest-mode account (competition demo, services/guest.py). Guest staff are read-only and only ever see guest
    # students; real staff never see guests. Guest students are throwaway and deleted after GUEST_STUDENT_HOURS.
    is_guest: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false(), index=True)

    student_profile: Mapped["StudentProfile | None"] = relationship(back_populates="user", uselist=False)
    teacher_profile: Mapped["TeacherProfile | None"] = relationship(back_populates="user", uselist=False)


class EmailVerification(IdMixin, TimestampMixin, Base):
    """The one pending email check for a user: a 6-digit code and a link token, both stored only as hashes.
    Re-sending replaces the row, so only the newest code and link work."""

    __tablename__ = "email_verifications"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)


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
    # Skill Passport share link: a random token; null = not shared. Regenerating it kills old links.
    passport_token: Mapped[str | None] = mapped_column(String(64), unique=True)
    passport_shared_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="student_profile")


class TeacherProfile(IdMixin, TimestampMixin, Base):
    __tablename__ = "teacher_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    institution: Mapped[str | None] = mapped_column(String(200))
    expertise: Mapped[list[str]] = mapped_column(JSON, default=list)
    bio: Mapped[str | None] = mapped_column(Text)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="teacher_profile")


class RevokedToken(Base):
    """JWT ids revoked before expiry (logout). Rows can be pruned once `expires_at` has passed."""

    __tablename__ = "revoked_tokens"

    jti: Mapped[str] = mapped_column(String(64), primary_key=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
