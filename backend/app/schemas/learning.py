"""Schemas for courses, lessons, progress, roadmap, assessments and the AI tutor."""

import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.models.enums import EducationLevel, Language, ProgressStatus
from app.schemas.student import CourseCard, NextLesson

# ---------- Courses & lessons ----------


class LessonSummary(BaseModel):
    id: str
    title: str
    order_index: int
    duration_min: int
    status: ProgressStatus


class CourseDetail(CourseCard):
    category: str
    lessons: list[LessonSummary]


class LessonOut(BaseModel):
    id: str
    title: str
    content_md: str
    order_index: int
    duration_min: int
    colab_url: str | None
    status: ProgressStatus
    course_id: str
    course_slug: str
    course_title: str
    course_level: EducationLevel
    is_demo: bool
    lesson_number: int
    lesson_count: int
    prev_lesson_id: str | None
    next_lesson_id: str | None


class ProgressIn(BaseModel):
    lesson_id: uuid.UUID
    status: Literal["in_progress", "completed"]


class ProgressOut(BaseModel):
    lesson_id: str
    course_id: str
    status: ProgressStatus
    course_percent: int
    next_lesson_id: str | None
    certificate_code: str | None = None  # set once every lesson in the course is completed


# ---------- Roadmap ----------

StageStatus = Literal["completed", "current", "upcoming", "locked"]


class RoadmapStage(BaseModel):
    key: str
    title: str
    description: str
    status: StageStatus
    percent: int
    skipped_by_assessment: bool
    courses: list[CourseCard]
    next_lesson: NextLesson | None
    available_in_phase: int | None = None


class RoadmapOut(BaseModel):
    education_level: EducationLevel | None
    overall_percent: int
    current_stage: str | None
    stages: list[RoadmapStage]


# ---------- Assessments ----------


class AssessmentCard(BaseModel):
    id: str
    title: str
    topic: str
    level: EducationLevel | None
    is_placement: bool
    is_demo: bool
    question_count: int
    time_limit_min: int | None
    attempts: int
    best_percent: int | None
    last_result_id: str | None
    in_progress_attempt_id: str | None


class QuestionOut(BaseModel):
    """A question as shown to a student. The answer key is deliberately absent."""

    id: str
    prompt: str
    options: list[str]
    topic_tag: str


class AttemptOut(BaseModel):
    attempt_id: str
    assessment_id: str
    title: str
    topic: str
    is_placement: bool
    is_demo: bool
    started_at: datetime
    expires_at: datetime | None
    questions: list[QuestionOut]


class SubmitIn(BaseModel):
    # question_id -> chosen option index (unanswered questions may be omitted)
    answers: dict[uuid.UUID, Annotated[int, Field(ge=0, le=9)]] = Field(default_factory=dict, max_length=200)


class TopicScore(BaseModel):
    topic: str
    correct: int
    total: int
    percent: int


class ReviewItem(BaseModel):
    question_id: str
    prompt: str
    options: list[str]
    your_answer: int | None
    is_correct: bool
    explanation: str | None


class ResultOut(BaseModel):
    result_id: str
    assessment_id: str
    title: str
    is_placement: bool
    score: int
    max_score: int
    percent: int
    completed_at: datetime
    topics: list[TopicScore]
    strengths: list[str]
    weaknesses: list[str]
    recommended_level: EducationLevel | None
    current_level: EducationLevel | None
    suggested_courses: list[CourseCard]
    review: list[ReviewItem]


# ---------- AI tutor ----------

Message = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


class ChatIn(BaseModel):
    message: Message
    conversation_id: uuid.UUID | None = None
    language: Literal["auto", "en", "bn"] = "auto"
    lesson_id: uuid.UUID | None = None


class SourceOut(BaseModel):
    title: str
    course_slug: str | None
    lesson_id: str | None


class MessageOut(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    sources: list[SourceOut]
    created_at: datetime


class ConversationOut(BaseModel):
    id: str
    title: str
    language: Language
    updated_at: datetime


class ChatOut(BaseModel):
    conversation: ConversationOut
    user_message: MessageOut
    assistant_message: MessageOut


class AIStatusOut(BaseModel):
    configured: bool
    daily_limit: int
    used_today: int


class QuizIn(BaseModel):
    topic: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=200)]
    count: int = Field(default=5, ge=3, le=10)
    language: Literal["auto", "en", "bn"] = "auto"


class PracticeQuestion(BaseModel):
    prompt: str
    options: list[str]
    correct_option: int  # AI-generated practice only; never stored or counted as an official score
    explanation: str


class QuizOut(BaseModel):
    topic: str
    questions: list[PracticeQuestion]
    notice: str
