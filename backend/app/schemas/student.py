from datetime import UTC, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.models.enums import EducationLevel, Language

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]
Interest = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]

CURRENT_YEAR = lambda: datetime.now(UTC).year  # noqa: E731


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    education_level: EducationLevel | None
    institution: str | None
    class_or_year: str | None
    district: str | None
    birth_year: int | None
    is_minor: bool
    guardian_consent_given: bool
    preferred_language: Language
    interests: list[str]
    goals: str | None
    onboarding_completed: bool
    recommended_level: EducationLevel | None


class OnboardingIn(BaseModel):
    education_level: EducationLevel
    institution: ShortText | None = None
    class_or_year: Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)] | None = None
    district: Annotated[str, StringConstraints(strip_whitespace=True, max_length=80)] | None = None
    birth_year: int = Field(ge=1950)
    preferred_language: Language = Language.en
    interests: list[Interest] = Field(default_factory=list, max_length=15)
    goals: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] | None = None
    guardian_consent: bool = False

    @model_validator(mode="after")
    def _check(self):
        year = CURRENT_YEAR()
        if self.birth_year > year - 8:
            raise ValueError("Birth year looks too recent; LEARN AI is for students aged 8 and above")
        return self


class ProfileUpdateIn(BaseModel):
    """Partial update. Students can change their level at any time."""

    education_level: EducationLevel | None = None
    institution: ShortText | None = None
    class_or_year: Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)] | None = None
    district: Annotated[str, StringConstraints(strip_whitespace=True, max_length=80)] | None = None
    preferred_language: Language | None = None
    interests: list[Interest] | None = Field(default=None, max_length=15)
    goals: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] | None = None
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)] | None = None


class CourseCard(BaseModel):
    id: str
    title: str
    slug: str
    description: str
    level: EducationLevel
    estimated_hours: float
    lesson_count: int
    completed_lessons: int
    percent: int
    is_demo: bool


class NextLesson(BaseModel):
    course_id: str
    course_title: str
    lesson_id: str
    lesson_title: str
    duration_min: int


class Deadline(BaseModel):
    opportunity_id: str
    title: str
    deadline: datetime
    official_url: str


class ModuleStatus(BaseModel):
    key: str
    title: str
    available: bool
    phase: int


class DashboardStats(BaseModel):
    lessons_completed: int
    courses_in_progress: int
    courses_completed: int
    assessments_taken: int
    latest_score_percent: int | None
    saved_opportunities: int
    unread_notifications: int


class DashboardOut(BaseModel):
    greeting_name: str
    education_level: EducationLevel | None
    preferred_language: Language
    stats: DashboardStats
    continue_learning: NextLesson | None
    recommended_courses: list[CourseCard]
    upcoming_deadlines: list[Deadline]
    modules: list[ModuleStatus]


class ContactIn(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
    email: Annotated[str, StringConstraints(strip_whitespace=True, max_length=320)]
    subject: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=200)]
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=10, max_length=5000)]

    @model_validator(mode="after")
    def _email(self):
        from email_validator import EmailNotValidError, validate_email

        try:
            self.email = validate_email(self.email, check_deliverability=False).normalized
        except EmailNotValidError as e:
            raise ValueError(f"Invalid email: {e}")
        return self
