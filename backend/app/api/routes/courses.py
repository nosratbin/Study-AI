"""AI Learning Center: courses, lessons, progress and the learning roadmap."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession, StudentUser
from app.core.errors import ApiError
from app.models import Course, LearningProgress, Lesson
from app.models.enums import EducationLevel, ProgressStatus
from app.schemas.learning import CourseDetail, LessonOut, LessonSummary, ProgressIn, ProgressOut, RoadmapOut
from app.schemas.student import CourseCard
from app.services.learning import course_card, course_percent, lesson_counts, load_progress
from app.services.roadmap import build_roadmap

router = APIRouter(tags=["learning"])


def _published_course(db, slug: str) -> Course:
    course = db.scalar(
        select(Course).options(selectinload(Course.lessons)).where(Course.slug == slug, Course.is_published.is_(True))
    )
    if not course:
        raise ApiError(404, "course_not_found", "Course not found.")
    return course


def _published_lesson(db, lesson_id: uuid.UUID) -> Lesson:
    lesson = db.get(Lesson, lesson_id)
    if not lesson or not lesson.course.is_published:
        raise ApiError(404, "lesson_not_found", "Lesson not found.")
    return lesson


@router.get("/courses", response_model=list[CourseCard])
def list_courses(user: CurrentUser, db: DbSession, level: EducationLevel | None = Query(default=None)):
    q = select(Course).where(Course.is_published.is_(True)).order_by(Course.order_index, Course.title)
    if level:
        q = q.where(Course.level == level)
    progress = load_progress(db, user.id)
    counts = lesson_counts(db)
    return [course_card(c, counts, progress) for c in db.scalars(q).all()]


@router.get("/courses/{slug}", response_model=CourseDetail)
def get_course(slug: str, user: CurrentUser, db: DbSession):
    course = _published_course(db, slug)
    progress = load_progress(db, user.id)
    card = course_card(course, lesson_counts(db), progress)
    return CourseDetail(
        **card.model_dump(), category=course.category,
        lessons=[
            LessonSummary(id=str(l.id), title=l.title, order_index=l.order_index, duration_min=l.duration_min,
                          status=progress.status_by_lesson.get(l.id, ProgressStatus.not_started))
            for l in course.lessons
        ],
    )


@router.get("/lessons/{lesson_id}", response_model=LessonOut)
def get_lesson(lesson_id: uuid.UUID, user: CurrentUser, db: DbSession):
    lesson = _published_lesson(db, lesson_id)
    course = lesson.course
    ordered = list(course.lessons)
    i = next(i for i, l in enumerate(ordered) if l.id == lesson.id)
    status = db.scalar(
        select(LearningProgress.status).where(LearningProgress.user_id == user.id, LearningProgress.lesson_id == lesson.id)
    )
    return LessonOut(
        id=str(lesson.id), title=lesson.title, content_md=lesson.content_md, order_index=lesson.order_index,
        duration_min=lesson.duration_min, colab_url=lesson.colab_url, status=status or ProgressStatus.not_started,
        course_id=str(course.id), course_slug=course.slug, course_title=course.title, course_level=course.level,
        is_demo=course.is_demo, lesson_number=i + 1, lesson_count=len(ordered),
        prev_lesson_id=str(ordered[i - 1].id) if i > 0 else None,
        next_lesson_id=str(ordered[i + 1].id) if i + 1 < len(ordered) else None,
    )


@router.post("/learning/progress", response_model=ProgressOut)
def update_progress(body: ProgressIn, user: StudentUser, db: DbSession):
    lesson = _published_lesson(db, body.lesson_id)
    row = db.scalar(
        select(LearningProgress).where(LearningProgress.user_id == user.id, LearningProgress.lesson_id == lesson.id)
    )
    if row is None:
        row = LearningProgress(user_id=user.id, course_id=lesson.course_id, lesson_id=lesson.id,
                               status=ProgressStatus.not_started, percent=0)
        db.add(row)
        try:
            db.flush()
        except IntegrityError:  # a parallel request created it first
            db.rollback()
            row = db.scalar(select(LearningProgress).where(LearningProgress.user_id == user.id,
                                                           LearningProgress.lesson_id == lesson.id))
    # Completion is sticky: re-opening a finished lesson never downgrades it.
    if body.status == "completed":
        if row.status != ProgressStatus.completed:
            row.status, row.percent, row.completed_at = ProgressStatus.completed, 100, datetime.now(UTC)
    elif row.status == ProgressStatus.not_started:
        row.status, row.percent = ProgressStatus.in_progress, 0
    db.commit()

    ordered = list(lesson.course.lessons)
    i = next(i for i, l in enumerate(ordered) if l.id == lesson.id)
    return ProgressOut(
        lesson_id=str(lesson.id), course_id=str(lesson.course_id), status=row.status,
        course_percent=course_percent(db, user.id, lesson.course_id),
        next_lesson_id=str(ordered[i + 1].id) if i + 1 < len(ordered) else None,
    )


@router.get("/learning/roadmap", response_model=RoadmapOut)
def roadmap(user: StudentUser, db: DbSession):
    if not user.student_profile or not user.student_profile.onboarding_completed:
        raise ApiError(409, "onboarding_required", "Finish setting up your profile first.")
    return build_roadmap(db, user)
