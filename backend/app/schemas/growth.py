"""Schemas for Phase 4: Project Lab, Skill Passport, MindCare and Study Planner."""

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import AfterValidator, BaseModel, Field, StringConstraints, model_validator

from app.models.enums import (
    EducationLevel,
    ProjectStatus,
    SkillKind,
    SupportRequestStatus,
    SupportResourceKind,
    SupportTopic,
    TaskStatus,
    VerificationStatus,
)


def _https(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    if not v:
        return None
    u = urlparse(v)
    if u.scheme != "https" or not u.netloc or "@" in u.netloc or " " in v or len(v) > 500:
        raise ValueError("Use a full https:// link, e.g. https://github.com/you/project")
    return v


HttpsUrl = Annotated[str | None, AfterValidator(_https)]


def dhaka_today() -> date:
    """Today's calendar date in Bangladesh (UTC+6), which is what students type."""
    return (datetime.now(UTC) + timedelta(hours=6)).date()


def _not_future(v: date | None) -> date | None:
    if v and v > dhaka_today():
        raise ValueError("The date can't be in the future.")
    return v


def text(min_length: int = 0, max_length: int = 200):
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length)]


# ---------- Project Lab ----------


class ChallengeOut(BaseModel):
    id: str
    slug: str
    title: str
    level: EducationLevel
    summary: str
    skills: list[str]
    estimated_hours: int
    starter_url: str | None
    is_demo: bool


class ChallengeDetail(ChallengeOut):
    brief_md: str


class ProjectIn(BaseModel):
    title: text(3, 200)
    description: text(0, 1000) = ""
    challenge_id: uuid.UUID | None = None
    level: EducationLevel | None = None
    repo_url: HttpsUrl = None
    colab_url: HttpsUrl = None
    documentation: text(0, 20000) | None = None
    is_public: bool = False


class ProjectUpdate(BaseModel):
    title: text(3, 200) | None = None
    description: text(0, 1000) | None = None
    repo_url: HttpsUrl = None
    colab_url: HttpsUrl = None
    documentation: text(0, 20000) | None = None
    is_public: bool | None = None


class ProjectOut(BaseModel):
    id: str
    title: str
    description: str
    level: EducationLevel | None
    challenge: ChallengeOut | None
    repo_url: str | None
    colab_url: str | None
    documentation: str | None
    status: ProjectStatus
    is_public: bool
    feedback: str | None
    score: int | None
    reviewer_name: str | None
    submitted_at: datetime | None
    reviewed_at: datetime | None
    updated_at: datetime
    owner_name: str | None = None  # only on the teacher review queue


class ReviewIn(BaseModel):
    feedback: text(10, 5000)
    score: int | None = Field(default=None, ge=0, le=100)


class AIFeedbackOut(BaseModel):
    strengths: list[str]
    improvements: list[str]
    next_steps: list[str]
    disclaimer: str = "AI suggestions to help you improve. This is not a grade; teachers review submitted projects."


# ---------- Skill Passport ----------


class SkillRecordIn(BaseModel):
    kind: SkillKind
    title: text(2, 200)
    description: text(0, 2000) | None = None
    evidence_url: HttpsUrl = None
    issued_by: text(0, 200) | None = None
    achieved_on: Annotated[date | None, AfterValidator(_not_future)] = None
    is_public: bool = False


class SkillRecordUpdate(BaseModel):
    title: text(2, 200) | None = None
    description: text(0, 2000) | None = None
    evidence_url: HttpsUrl = None
    issued_by: text(0, 200) | None = None
    achieved_on: Annotated[date | None, AfterValidator(_not_future)] = None
    is_public: bool | None = None


class SkillRecordOut(BaseModel):
    id: str
    kind: SkillKind
    title: str
    description: str | None
    evidence_url: str | None
    issued_by: str | None
    achieved_on: date | None
    verification_status: VerificationStatus
    verified_at: datetime | None
    is_public: bool


class SkillRecordAdminOut(SkillRecordOut):
    owner_name: str
    review_note: str | None


class SkillVerifyIn(BaseModel):
    status: Literal["verified", "rejected"]
    review_note: text(5, 1000)


class CompletedCourse(BaseModel):
    course_id: str
    title: str
    level: EducationLevel
    category: str | None
    completed_lessons: int
    total_lessons: int
    certificate_code: str | None
    issued_at: datetime | None
    is_demo: bool = False  # seeded demo course: its certificate is labelled "Demo"


class AssessmentSummary(BaseModel):
    title: str
    score: int
    max_score: int
    recommended_level: EducationLevel | None
    completed_at: datetime | None


class PassportProject(BaseModel):
    id: str
    title: str
    description: str
    status: ProjectStatus
    repo_url: str | None
    colab_url: str | None
    reviewed: bool
    is_public: bool


class ShareState(BaseModel):
    enabled: bool
    token: str | None
    shared_at: datetime | None


class PassportOut(BaseModel):
    full_name: str
    education_level: EducationLevel | None
    institution: str | None
    is_minor: bool
    courses: list[CompletedCourse]
    in_progress_courses: list[CompletedCourse]
    assessments: list[AssessmentSummary]
    projects: list[PassportProject]
    records: list[SkillRecordOut]
    skills: list[str]
    share: ShareState


class ShareIn(BaseModel):
    enabled: bool


class PublicPassportOut(BaseModel):
    display_name: str
    education_level: EducationLevel | None
    institution: str | None  # hidden for students under 18
    courses: list[CompletedCourse]
    projects: list[PassportProject]
    records: list[SkillRecordOut]
    skills: list[str]


class CertificateCheckOut(BaseModel):
    valid: bool
    code: str
    title: str | None = None
    holder: str | None = None
    issued_at: datetime | None = None
    is_demo: bool = False


# ---------- MindCare ----------

MOOD_TAGS = ("exams", "homework", "family", "friends", "sleep", "health", "future", "money", "sports", "achievement")


class CheckinIn(BaseModel):
    mood: int = Field(ge=1, le=5)
    note: text(0, 2000) | None = None
    tags: list[Literal[MOOD_TAGS]] = Field(default_factory=list, max_length=6)  # type: ignore[valid-type]


class CheckinOut(BaseModel):
    id: str
    mood: int
    note: str | None
    tags: list[str]
    created_at: datetime


class CheckinCreated(CheckinOut):
    show_support: bool  # gently surface support options after a low check-in


class SupportResourceOut(BaseModel):
    id: str
    name: str
    kind: SupportResourceKind
    description: str
    phone: str | None
    url: str | None
    hours: str | None
    languages: list[str]
    cost_note: str | None


class SupportResourceIn(BaseModel):
    name: text(2, 200)
    kind: SupportResourceKind
    description: text(10, 2000)
    phone: Annotated[str, StringConstraints(strip_whitespace=True, max_length=40, pattern=r"^[0-9+()\- ]{3,40}$")] | None = None
    url: HttpsUrl = None
    hours: text(0, 120) | None = None
    languages: list[Literal["bn", "en"]] = Field(default_factory=list)
    cost_note: text(0, 200) | None = None

    @model_validator(mode="after")
    def _contact(self):
        if not self.phone and not self.url:
            raise ValueError("Add a phone number or an https:// link so students can reach them.")
        return self


class SupportResourceAdminOut(SupportResourceOut):
    verification_status: VerificationStatus
    verified_by_name: str | None
    verified_at: datetime | None
    source_note: str | None


class ResourceVerifyIn(BaseModel):
    status: Literal["verified", "rejected"]
    source_note: text(5, 1000)


class SupportRequestIn(BaseModel):
    topic: SupportTopic
    message: text(10, 3000)
    preferred_contact: Literal["email", "phone"] = "email"
    phone: Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\+?[0-9 \-]{8,20}$")] | None = None

    @model_validator(mode="after")
    def _phone(self):
        if self.preferred_contact == "phone" and not self.phone:
            raise ValueError("Add a phone number, or choose email.")
        if self.preferred_contact == "email":
            self.phone = None  # don't keep a number we won't use
        return self


class SupportRequestOut(BaseModel):
    id: str
    topic: SupportTopic
    message: str | None
    preferred_contact: str
    status: SupportRequestStatus
    created_at: datetime
    handled_at: datetime | None


class SupportRequestAdminOut(SupportRequestOut):
    student_name: str
    student_email: str
    phone: str | None
    is_minor: bool


class SupportStatusIn(BaseModel):
    status: SupportRequestStatus


# ---------- Study Planner ----------


class TaskIn(BaseModel):
    title: text(2, 200)
    due_on: date
    planned_minutes: int = Field(default=30, ge=5, le=480)
    lesson_id: uuid.UUID | None = None
    notes: text(0, 1000) | None = None


class TaskUpdate(BaseModel):
    title: text(2, 200) | None = None
    due_on: date | None = None
    planned_minutes: int | None = Field(default=None, ge=5, le=480)
    status: TaskStatus | None = None
    notes: text(0, 1000) | None = None


class TaskOut(BaseModel):
    id: str
    title: str
    due_on: date
    planned_minutes: int
    status: TaskStatus
    done_at: datetime | None
    lesson_id: str | None
    lesson_title: str | None
    notes: str | None


class TaskSuggestion(BaseModel):
    lesson_id: str
    title: str
    course_title: str
    duration_min: int


class PlannerSummary(BaseModel):
    week_start: date
    planned_minutes: int
    done_minutes: int
    tasks_done: int
    tasks_total: int
    streak_days: int  # consecutive days up to today with at least one finished task
