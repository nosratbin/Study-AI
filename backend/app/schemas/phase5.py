"""Schemas for Phase 5: notifications, teacher and admin dashboards, course authoring, Career Navigator."""

from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import AfterValidator, BaseModel, Field, StringConstraints

from app.models.enums import EducationLevel, ProgressStatus, ProjectStatus, Role

Text200 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=200)]


def _internal_link(v: str | None) -> str | None:
    """Notification links stay inside the app: a path like /learn, never an external or protocol-relative URL."""
    if v is None or not v.strip():
        return None
    v = v.strip()
    if not v.startswith("/") or v.startswith("//") or "\\" in v or len(v) > 300 or any(c.isspace() for c in v):
        raise ValueError("Use a path inside IccheGhuri, e.g. /opportunities-hub")
    return v


def _colab(v: str | None) -> str | None:
    if v is None or not v.strip():
        return None
    v = v.strip()
    u = urlparse(v)
    if u.scheme != "https" or u.netloc != "colab.research.google.com" or len(v) > 500:
        raise ValueError("Use a https://colab.research.google.com/... link")
    return v


InternalLink = Annotated[str | None, AfterValidator(_internal_link)]
ColabUrl = Annotated[str | None, AfterValidator(_colab)]


# ---------- notifications ----------


class NotificationOut(BaseModel):
    id: str
    title: str
    body: str
    kind: str
    link: str | None
    read_at: datetime | None
    created_at: datetime


class NotificationList(BaseModel):
    items: list[NotificationOut]
    unread: int


class UnreadCount(BaseModel):
    unread: int


class AnnouncementIn(BaseModel):
    title: Text200
    body: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""
    link: InternalLink = None
    audience: Literal["all", "students", "teachers"] = "students"
    level: EducationLevel | None = None  # students only: limit to one education level


class AnnouncementOut(BaseModel):
    sent: int


# ---------- shared dashboard pieces ----------


class DayCount(BaseModel):
    day: str  # YYYY-MM-DD (Bangladesh calendar day)
    count: int


class LabelCount(BaseModel):
    label: str
    count: int


# ---------- teacher ----------


class TeacherStats(BaseModel):
    students: int
    active_7d: int
    lessons_completed_7d: int
    review_queue: int
    my_reviews: int
    verified: bool  # unverified teachers see the dashboard but cannot open student records, author or review


class CourseStat(BaseModel):
    id: str
    title: str
    slug: str
    level: EducationLevel
    is_published: bool
    is_demo: bool
    lesson_count: int
    learners: int
    completions: int
    avg_percent: int


class AssessmentStat(BaseModel):
    id: str
    title: str
    attempts: int
    avg_percent: int


class TopicStat(BaseModel):
    topic: str
    label: str
    avg_percent: int
    questions: int


class TeacherDashboardOut(BaseModel):
    stats: TeacherStats
    activity: list[DayCount]  # lessons completed per day, last 14 days
    courses: list[CourseStat]
    assessments: list[AssessmentStat]
    weak_topics: list[TopicStat]


class StudentRow(BaseModel):
    id: str
    full_name: str
    education_level: EducationLevel | None
    institution: str | None
    is_minor: bool
    lessons_completed: int
    courses_completed: int
    avg_assessment: int | None
    projects_submitted: int
    last_active: datetime | None


class StudentCourseProgress(BaseModel):
    course_id: str
    title: str
    completed_lessons: int
    lesson_count: int
    percent: int


class StudentResult(BaseModel):
    assessment_title: str
    percent: int
    completed_at: datetime | None


class StudentProject(BaseModel):
    id: str
    title: str
    status: ProjectStatus
    score: int | None


class StudentDetail(BaseModel):
    student: StudentRow
    interests: list[str]
    courses: list[StudentCourseProgress]
    results: list[StudentResult]
    projects: list[StudentProject]


# ---------- course authoring ----------


class CourseIn(BaseModel):
    title: Text200
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""
    level: EducationLevel
    category: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=60)] = "ai_fundamentals"
    estimated_hours: float = Field(default=1.0, ge=0.25, le=200)


class CourseUpdate(BaseModel):
    title: Text200 | None = None
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] | None = None
    level: EducationLevel | None = None
    category: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=60)] | None = None
    estimated_hours: float | None = Field(default=None, ge=0.25, le=200)
    is_published: bool | None = None


class LessonIn(BaseModel):
    title: Text200
    content_md: Annotated[str, StringConstraints(max_length=60000)] = ""
    duration_min: int = Field(default=10, ge=1, le=600)
    colab_url: ColabUrl = None


class LessonUpdate(BaseModel):
    title: Text200 | None = None
    content_md: Annotated[str, StringConstraints(max_length=60000)] | None = None
    duration_min: int | None = Field(default=None, ge=1, le=600)
    colab_url: ColabUrl = None


class LessonOrderIn(BaseModel):
    lesson_ids: list[str] = Field(min_length=1, max_length=500)


class StaffLesson(BaseModel):
    id: str
    title: str
    order_index: int
    duration_min: int
    colab_url: str | None
    content_md: str


class StaffCourse(BaseModel):
    id: str
    title: str
    slug: str
    description: str
    level: EducationLevel
    category: str
    estimated_hours: float
    is_published: bool
    is_demo: bool
    created_by_name: str | None
    can_edit: bool
    lesson_count: int
    updated_at: datetime


class StaffCourseDetail(StaffCourse):
    lessons: list[StaffLesson]


# ---------- admin ----------


class AdminStats(BaseModel):
    students: int
    teachers: int
    admins: int
    active_7d: int
    new_30d: int
    deactivated: int


class AdminContent(BaseModel):
    courses_published: int
    lessons: int
    assessments: int
    challenges: int
    careers: int
    opportunities_verified: int


class AdminQueues(BaseModel):
    opportunities_pending: int
    achievements_pending: int
    projects_submitted: int


class AuditOut(BaseModel):
    id: str
    actor_name: str | None
    action: str
    target_type: str
    target_id: str | None
    details: dict
    ip: str | None
    created_at: datetime


class AdminDashboardOut(BaseModel):
    stats: AdminStats
    students_by_level: list[LabelCount]
    signups: list[DayCount]  # last 30 days
    lessons_completed: list[DayCount]  # last 14 days
    ai_messages: list[DayCount]  # last 14 days (student questions only)
    content: AdminContent
    queues: AdminQueues
    recent_audit: list[AuditOut]


class UserAdminOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: Role
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None
    education_level: EducationLevel | None
    institution: str | None
    is_minor: bool
    teacher_verified: bool | None


class UserPage(BaseModel):
    items: list[UserAdminOut]
    total: int


class UserAdminUpdate(BaseModel):
    role: Role | None = None
    is_active: bool | None = None
    teacher_verified: bool | None = None


# ---------- careers ----------


class CareerCard(BaseModel):
    id: str
    slug: str
    title: str
    field: str
    summary: str
    is_demo: bool
    match: int  # 0-100, rule-based
    reasons: list[str]
    is_goal: bool


class CareerSkill(BaseModel):
    name: str
    have: bool
    evidence: str | None


class CareerCourse(BaseModel):
    slug: str
    title: str
    level: EducationLevel
    is_demo: bool
    status: ProgressStatus
    percent: int


class CareerOpportunity(BaseModel):
    id: str
    title: str
    category_label: str
    deadline: datetime | None


class CareerDetail(CareerCard):
    description_md: str
    skills: list[CareerSkill]
    education_paths: list[str]
    courses: list[CareerCourse]
    opportunities: list[CareerOpportunity]
    goal_note: str | None


class CareerGoalIn(BaseModel):
    note: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] | None = None


class PlanStep(BaseModel):
    title: str
    detail: str


class CareerPlanOut(BaseModel):
    steps: list[PlanStep]
    note: str
