"""Student dashboard aggregation.

Deliberately does NOT read MindCare tables: well-being data stays separate from
academic data.
"""

from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    AssessmentResult,
    Course,
    LearningProgress,
    Lesson,
    Notification,
    Opportunity,
    SavedOpportunity,
    User,
)
from app.models.enums import ProgressStatus, VerificationStatus
from app.schemas.student import (
    CourseCard,
    DashboardOut,
    DashboardStats,
    Deadline,
    ModuleStatus,
    NextLesson,
)

# Single source of truth for which modules exist and when they ship.
MODULES: list[tuple[str, str, int]] = [
    ("dashboard", "Dashboard", 1),
    ("learning_center", "AI Learning Center", 2),
    ("ai_tutor", "AI Tutor", 2),
    ("assessment", "Quiz & Assessment", 2),
    ("roadmap", "Learning Roadmap", 2),
    ("opportunities", "Opportunity Hub", 3),
    ("google", "Google Workspace", 3),
    ("project_lab", "AI Project Lab", 4),
    ("skill_passport", "Skill Passport", 4),
    ("mindcare", "MindCare", 4),
    ("study_planner", "Study Planner", 4),
    ("career", "Career Navigator", 4),
    ("notifications", "Notifications", 5),
]
CURRENT_PHASE = 2


def build_dashboard(db: Session, user: User) -> DashboardOut:
    profile = user.student_profile
    level = profile.education_level if profile else None

    # Lesson counts per course and the user's completed lessons per course.
    lesson_counts = dict(db.execute(select(Lesson.course_id, func.count(Lesson.id)).group_by(Lesson.course_id)).all())
    completed_rows = db.execute(
        select(LearningProgress.course_id, LearningProgress.lesson_id).where(
            LearningProgress.user_id == user.id,
            LearningProgress.status == ProgressStatus.completed,
            LearningProgress.lesson_id.is_not(None),
        )
    ).all()
    completed_by_course: dict = defaultdict(set)
    for course_id, lesson_id in completed_rows:
        completed_by_course[course_id].add(lesson_id)

    started_course_ids = set(
        db.scalars(select(LearningProgress.course_id).where(LearningProgress.user_id == user.id)).all()
    )

    course_q = select(Course).where(Course.is_published.is_(True)).order_by(Course.order_index, Course.title)
    if level:
        course_q = course_q.where(Course.level == level)
    courses = db.scalars(course_q.limit(12)).all()

    def card(c: Course) -> CourseCard:
        total = lesson_counts.get(c.id, 0)
        done = len(completed_by_course.get(c.id, ()))
        return CourseCard(
            id=str(c.id), title=c.title, slug=c.slug, description=c.description, level=c.level,
            estimated_hours=c.estimated_hours, lesson_count=total, completed_lessons=done,
            percent=round(100 * done / total) if total else 0, is_demo=c.is_demo,
        )

    cards = [card(c) for c in courses]
    # In-progress first, then not started, completed last.
    cards.sort(key=lambda c: (c.percent == 100, c.percent == 0, -c.percent))

    courses_completed = sum(1 for cid, done in completed_by_course.items() if done and len(done) >= lesson_counts.get(cid, 0) > 0)
    courses_in_progress = len(started_course_ids) - courses_completed

    continue_learning = _next_lesson(db, [c for c in courses], completed_by_course, started_course_ids)

    results = db.scalars(
        select(AssessmentResult)
        .where(AssessmentResult.user_id == user.id, AssessmentResult.completed_at.is_not(None))
        .order_by(AssessmentResult.completed_at.desc())
    ).all()
    latest = results[0] if results else None

    now = datetime.now(UTC)
    deadlines = db.execute(
        select(Opportunity)
        .join(SavedOpportunity, SavedOpportunity.opportunity_id == Opportunity.id)
        .where(
            SavedOpportunity.user_id == user.id,
            Opportunity.verification_status == VerificationStatus.verified,
            Opportunity.deadline.is_not(None),
            Opportunity.deadline >= now,
        )
        .order_by(Opportunity.deadline)
        .limit(5)
    ).scalars().all()

    saved_count = db.scalar(
        select(func.count()).select_from(SavedOpportunity)
        .join(Opportunity, Opportunity.id == SavedOpportunity.opportunity_id)
        .where(SavedOpportunity.user_id == user.id, Opportunity.verification_status == VerificationStatus.verified)
    ) or 0
    unread = db.scalar(
        select(func.count()).select_from(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))
    ) or 0

    return DashboardOut(
        greeting_name=user.full_name.split(" ")[0],
        education_level=level,
        preferred_language=profile.preferred_language if profile else "en",
        stats=DashboardStats(
            lessons_completed=len(completed_rows),
            courses_in_progress=max(courses_in_progress, 0),
            courses_completed=courses_completed,
            assessments_taken=len(results),
            latest_score_percent=round(100 * latest.score / latest.max_score) if latest and latest.max_score else None,
            saved_opportunities=saved_count,
            unread_notifications=unread,
        ),
        continue_learning=continue_learning,
        recommended_courses=cards[:6],
        upcoming_deadlines=[
            Deadline(opportunity_id=str(o.id), title=o.title, deadline=o.deadline, official_url=o.official_url) for o in deadlines
        ],
        modules=[ModuleStatus(key=k, title=t, phase=p, available=p <= CURRENT_PHASE) for k, t, p in MODULES],
    )


def _next_lesson(db: Session, courses: list[Course], completed_by_course, started_ids) -> NextLesson | None:
    ordered = sorted(courses, key=lambda c: (c.id not in started_ids, c.order_index))
    for course in ordered:
        done = completed_by_course.get(course.id, set())
        for lesson in course.lessons:
            if lesson.id not in done:
                return NextLesson(
                    course_id=str(course.id), course_title=course.title, lesson_id=str(lesson.id),
                    lesson_title=lesson.title, duration_min=lesson.duration_min,
                )
    return None
