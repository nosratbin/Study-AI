"""AI tutor, projects, opportunities, MindCare, skill passport, mentorship, notifications,
Google connections, audit and contact tables."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin
from app.models.enums import (
    ApplicationStatus,
    ChatRole,
    EducationLevel,
    Language,
    OpportunityCategory,
    ProjectStatus,
    SessionStatus,
    SkillKind,
    VerificationStatus,
    str_enum,
)

# ---------- AI tutor ----------


class AIConversation(IdMixin, TimestampMixin, Base):
    __tablename__ = "ai_conversations"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), default="New conversation")
    language: Mapped[Language] = mapped_column(str_enum(Language, "conversation_language"), default=Language.en)
    course_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"))


class AIMessage(IdMixin, TimestampMixin, Base):
    __tablename__ = "ai_messages"
    __table_args__ = (Index("ix_ai_messages_conv_created", "conversation_id", "created_at"),)

    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ai_conversations.id", ondelete="CASCADE"))
    role: Mapped[ChatRole] = mapped_column(str_enum(ChatRole, "message_role"))
    content: Mapped[str] = mapped_column(Text)
    tokens: Mapped[int | None] = mapped_column(Integer)
    sources: Mapped[list] = mapped_column(JSON, default=list)


# ---------- Project lab ----------


class Project(IdMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    level: Mapped[EducationLevel | None] = mapped_column(str_enum(EducationLevel, "project_level"))
    repo_url: Mapped[str | None] = mapped_column(String(500))
    colab_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[ProjectStatus] = mapped_column(str_enum(ProjectStatus, "project_status"), default=ProjectStatus.draft)
    feedback: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    score: Mapped[int | None] = mapped_column(SmallInteger)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)


# ---------- Opportunity hub ----------


class Opportunity(IdMixin, TimestampMixin, Base):
    __tablename__ = "opportunities"
    __table_args__ = (Index("ix_opportunities_status_deadline", "verification_status", "deadline"),)

    title: Mapped[str] = mapped_column(String(250))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[OpportunityCategory] = mapped_column(str_enum(OpportunityCategory, "opportunity_category"), index=True)
    provider: Mapped[str] = mapped_column(String(200))
    eligibility: Mapped[str] = mapped_column(Text)
    education_levels: Mapped[list[str]] = mapped_column(JSON, default=list)
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))  # null = rolling / not announced
    required_documents: Mapped[list[str]] = mapped_column(JSON, default=list)
    official_url: Mapped[str] = mapped_column(String(500))
    verification_status: Mapped[VerificationStatus] = mapped_column(
        str_enum(VerificationStatus, "opportunity_verification"), default=VerificationStatus.unverified
    )
    verified_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_note: Mapped[str | None] = mapped_column(Text)  # where the verifier confirmed the details


class SavedOpportunity(IdMixin, TimestampMixin, Base):
    __tablename__ = "saved_opportunities"
    __table_args__ = (UniqueConstraint("user_id", "opportunity_id", name="uq_saved_opportunities_user_opp"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("opportunities.id", ondelete="CASCADE"))


class Application(IdMixin, TimestampMixin, Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("user_id", "opportunity_id", name="uq_applications_user_opp"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("opportunities.id", ondelete="CASCADE"))
    status: Mapped[ApplicationStatus] = mapped_column(str_enum(ApplicationStatus, "application_status"), default=ApplicationStatus.planned)
    notes: Mapped[str | None] = mapped_column(Text)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ---------- MindCare (isolated: never joined with academic data) ----------


class MoodCheckin(IdMixin, TimestampMixin, Base):
    __tablename__ = "mood_checkins"
    __table_args__ = (Index("ix_mood_checkins_user_created", "user_id", "created_at"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    mood: Mapped[int] = mapped_column(SmallInteger)  # 1..5
    note: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)


# ---------- Skill passport ----------


class SkillRecord(IdMixin, TimestampMixin, Base):
    __tablename__ = "skill_records"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[SkillKind] = mapped_column(str_enum(SkillKind, "skill_kind"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    evidence_url: Mapped[str | None] = mapped_column(String(500))
    issued_by: Mapped[str | None] = mapped_column(String(200))
    achieved_on: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    verification_status: Mapped[VerificationStatus] = mapped_column(
        str_enum(VerificationStatus, "skill_verification"), default=VerificationStatus.unverified
    )
    verified_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)


class Certificate(IdMixin, TimestampMixin, Base):
    __tablename__ = "certificates"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(200))
    certificate_code: Mapped[str] = mapped_column(String(40), unique=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


# ---------- Mentorship ----------


class MentorshipSession(IdMixin, TimestampMixin, Base):
    __tablename__ = "mentorship_sessions"

    mentor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    topic: Mapped[str] = mapped_column(String(200))
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    meet_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[SessionStatus] = mapped_column(str_enum(SessionStatus, "session_status"), default=SessionStatus.requested)
    notes: Mapped[str | None] = mapped_column(Text)


# ---------- Notifications ----------


class Notification(IdMixin, TimestampMixin, Base):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_read", "user_id", "read_at"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(40), default="info")
    link: Mapped[str | None] = mapped_column(String(300))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ---------- Google ----------


class GoogleConnection(IdMixin, TimestampMixin, Base):
    __tablename__ = "google_connections"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    google_sub: Mapped[str] = mapped_column(String(64))
    google_email: Mapped[str | None] = mapped_column(String(320))
    drive_folder_id: Mapped[str | None] = mapped_column(String(128))  # the "LEARN AI" folder this app created
    scopes: Mapped[list[str]] = mapped_column(JSON, default=list)
    refresh_token_enc: Mapped[str | None] = mapped_column(Text)  # Fernet-encrypted
    access_token_enc: Mapped[str | None] = mapped_column(Text)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ---------- Audit & contact ----------


class AuditLog(IdMixin, TimestampMixin, Base):
    __tablename__ = "audit_logs"

    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(80))
    target_type: Mapped[str] = mapped_column(String(60))
    target_id: Mapped[str | None] = mapped_column(String(64))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    ip: Mapped[str | None] = mapped_column(String(64))


class ContactMessage(IdMixin, TimestampMixin, Base):
    __tablename__ = "contact_messages"

    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(320))
    subject: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    handled: Mapped[bool] = mapped_column(Boolean, default=False)
