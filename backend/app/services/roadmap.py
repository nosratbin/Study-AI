"""Learning roadmap: Python -> AI Fundamentals -> Machine Learning -> Deep Learning -> AI Projects.

Stage status is derived from real lesson progress; a stage can also be skipped by
scoring >= SKIP_STAGE_PCT on a published topic assessment for that stage.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Assessment, AssessmentResult, Course, User
from app.models.enums import EducationLevel
from app.schemas.learning import RoadmapOut, RoadmapStage
from app.services.assessment import SKIP_STAGE_PCT
from app.services.learning import course_card, lesson_counts, load_progress, next_lesson_in

STAGES: list[tuple[str, str, str, list[str], int | None]] = [
    ("python", "Python Programming", "Variables, control flow, functions and data structures — the base for everything else.",
     ["programming", "python"], None),
    ("ai_fundamentals", "AI Fundamentals", "What AI is, types of machine learning, features, labels and evaluation.",
     ["ai_fundamentals"], None),
    ("machine_learning", "Machine Learning", "Build, validate and tune models with real data.", ["machine_learning"], None),
    ("deep_learning", "Deep Learning", "Neural networks, backpropagation and transfer learning.", ["deep_learning"], None),
    ("projects", "AI Project Development", "Build and present real AI projects in the AI Project Lab.", [], 4),
]

LEVEL_ORDER = [EducationLevel.school, EducationLevel.college, EducationLevel.university]


def _pick_courses(courses: list[Course], level: EducationLevel | None) -> list[Course]:
    """Courses at the student's level; if none exist for this stage, the nearest level that has some."""
    if not courses:
        return []
    if level is None:
        return courses
    idx = LEVEL_ORDER.index(level)
    by_distance = sorted({abs(LEVEL_ORDER.index(c.level) - idx) for c in courses})
    best = by_distance[0]
    return [c for c in courses if abs(LEVEL_ORDER.index(c.level) - idx) == best]


def build_roadmap(db: Session, user: User) -> RoadmapOut:
    profile = user.student_profile
    level = profile.education_level if profile else None
    progress = load_progress(db, user.id)
    counts = lesson_counts(db)

    published = db.scalars(
        select(Course).options(selectinload(Course.lessons)).where(Course.is_published.is_(True))
        .order_by(Course.order_index, Course.title)
    ).all()

    # Best completed score per topic for published topic tests (placement tests don't skip stages).
    best_by_topic: dict[str, int] = {}
    rows = db.execute(
        select(Assessment.topic, Assessment.level, AssessmentResult.score, AssessmentResult.max_score)
        .join(AssessmentResult, AssessmentResult.assessment_id == Assessment.id)
        .where(AssessmentResult.user_id == user.id, AssessmentResult.completed_at.is_not(None),
               Assessment.is_placement.is_(False))
    ).all()
    for topic, a_level, score, max_score in rows:
        # A test below the student's level (e.g. a school test for a college student) can't skip a stage.
        if a_level is not None and level is not None and LEVEL_ORDER.index(a_level) < LEVEL_ORDER.index(level):
            continue
        if max_score:
            best_by_topic[topic] = max(best_by_topic.get(topic, 0), round(100 * score / max_score))

    stages: list[RoadmapStage] = []
    current: str | None = None
    weights: list[int] = []
    for key, title, desc, categories, phase in STAGES:
        if phase is not None:
            stages.append(RoadmapStage(key=key, title=title, description=desc, status="locked", percent=0,
                                       skipped_by_assessment=False, courses=[], next_lesson=None,
                                       available_in_phase=phase))
            continue
        chosen = _pick_courses([c for c in published if c.category in categories], level)
        cards = [course_card(c, counts, progress) for c in chosen]
        total = sum(c.lesson_count for c in cards)
        done = sum(c.completed_lessons for c in cards)
        percent = round(100 * done / total) if total else 0
        skipped = any(best_by_topic.get(cat, 0) >= SKIP_STAGE_PCT for cat in categories + [key])
        completed = skipped or (total > 0 and done >= total)
        nxt = None
        if not completed:
            for c in chosen:
                nxt = next_lesson_in(c, progress)
                if nxt:
                    break
        if completed:
            status = "completed"
        elif current is None:
            status, current = "current", key
        else:
            status = "upcoming"
        stages.append(RoadmapStage(key=key, title=title, description=desc, status=status,
                                   percent=100 if completed else percent, skipped_by_assessment=skipped and done < total,
                                   courses=cards, next_lesson=nxt))
        weights.append(100 if completed else percent)

    overall = round(sum(weights) / len(weights)) if weights else 0
    return RoadmapOut(education_level=level, overall_percent=overall, current_stage=current, stages=stages)
