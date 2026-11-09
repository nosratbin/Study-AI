"""Course / lesson progress helpers shared by the courses, roadmap and assessment modules."""

import uuid
from collections import defaultdict
from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Course, LearningProgress, Lesson
from app.models.enums import ProgressStatus
from app.schemas.student import CourseCard, NextLesson


@dataclass
class UserProgress:
    status_by_lesson: dict[uuid.UUID, ProgressStatus] = field(default_factory=dict)
    completed_by_course: dict[uuid.UUID, set[uuid.UUID]] = field(default_factory=lambda: defaultdict(set))
    started_courses: set[uuid.UUID] = field(default_factory=set)


def load_progress(db: Session, user_id: uuid.UUID) -> UserProgress:
    p = UserProgress()
    rows = db.execute(
        select(LearningProgress.course_id, LearningProgress.lesson_id, LearningProgress.status).where(
            LearningProgress.user_id == user_id
        )
    ).all()
    for course_id, lesson_id, status in rows:
        p.started_courses.add(course_id)
        if lesson_id is not None:
            p.status_by_lesson[lesson_id] = status
            if status == ProgressStatus.completed:
                p.completed_by_course[course_id].add(lesson_id)
    return p


def lesson_counts(db: Session) -> dict[uuid.UUID, int]:
    return dict(db.execute(select(Lesson.course_id, func.count(Lesson.id)).group_by(Lesson.course_id)).all())


def course_card(c: Course, counts: dict, progress: UserProgress) -> CourseCard:
    total = counts.get(c.id, 0)
    done = len(progress.completed_by_course.get(c.id, ()))
    return CourseCard(
        id=str(c.id), title=c.title, slug=c.slug, description=c.description, level=c.level,
        estimated_hours=c.estimated_hours, lesson_count=total, completed_lessons=done,
        percent=round(100 * done / total) if total else 0, is_demo=c.is_demo,
    )


def next_lesson_in(course: Course, progress: UserProgress) -> NextLesson | None:
    done = progress.completed_by_course.get(course.id, set())
    for lesson in course.lessons:
        if lesson.id not in done:
            return NextLesson(course_id=str(course.id), course_title=course.title, lesson_id=str(lesson.id),
                              lesson_title=lesson.title, duration_min=lesson.duration_min)
    return None


def course_percent(db: Session, user_id: uuid.UUID, course_id: uuid.UUID) -> int:
    total = db.scalar(select(func.count(Lesson.id)).where(Lesson.course_id == course_id)) or 0
    done = db.scalar(
        select(func.count(LearningProgress.id)).where(
            LearningProgress.user_id == user_id, LearningProgress.course_id == course_id,
            LearningProgress.status == ProgressStatus.completed, LearningProgress.lesson_id.is_not(None),
        )
    ) or 0
    return round(100 * done / total) if total else 0
