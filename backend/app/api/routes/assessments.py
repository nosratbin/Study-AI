"""Skill assessment: placement and topic tests, auto-scored from stored answer keys.

Integrity rules:
- Questions are sent WITHOUT correct_option, before and after submission.
- Scoring happens only on the server, from assessment_questions.correct_option.
- An attempt belongs to one user, can be submitted once, and must respect its time limit.
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import DbSession, StudentUser
from app.core.errors import ApiError
from app.models import Assessment, AssessmentResult, Course, User
from app.schemas.learning import (
    AssessmentCard,
    AttemptOut,
    QuestionOut,
    ResultOut,
    ReviewItem,
    SubmitIn,
    TopicScore,
)
from app.services.assessment import TIME_GRACE_S, pct, recommend_level, score_attempt, strengths_weaknesses
from app.services.learning import course_card, lesson_counts, load_progress

router = APIRouter(prefix="/assessments", tags=["assessment"])


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)  # SQLite returns naive datetimes


def _expires_at(a: Assessment, r: AssessmentResult) -> datetime | None:
    return _aware(r.created_at) + timedelta(minutes=a.time_limit_min) if a.time_limit_min else None


def _is_expired(a: Assessment, r: AssessmentResult, grace_s: int = TIME_GRACE_S) -> bool:
    exp = _expires_at(a, r)
    return exp is not None and datetime.now(UTC) > exp + timedelta(seconds=grace_s)


def _get_published(db: Session, assessment_id: uuid.UUID) -> Assessment:
    a = db.scalar(select(Assessment).options(selectinload(Assessment.questions))
                  .where(Assessment.id == assessment_id, Assessment.is_published.is_(True)))
    if not a:
        raise ApiError(404, "assessment_not_found", "Assessment not found.")
    return a


def _own_attempt(db: Session, user: User, attempt_id: uuid.UUID) -> AssessmentResult:
    r = db.get(AssessmentResult, attempt_id)
    if not r or r.user_id != user.id:  # 404 (not 403) so attempt ids can't be probed
        raise ApiError(404, "attempt_not_found", "Attempt not found.")
    return r


def _finalize(db: Session, user: User, a: Assessment, r: AssessmentResult, submitted: dict[str, int]) -> None:
    s = score_attempt(list(a.questions), submitted)
    r.score, r.max_score, r.answers = s.score, s.max_score, s.answers
    r.topic_breakdown = {"topics": s.topic_breakdown, "difficulty": {str(k): v for k, v in s.difficulty_breakdown.items()}}
    r.completed_at = datetime.now(UTC)
    if a.is_placement:
        r.recommended_level = recommend_level(s)
        if user.student_profile:
            user.student_profile.recommended_level = r.recommended_level


@router.get("", response_model=list[AssessmentCard])
def list_assessments(user: StudentUser, db: DbSession):
    level = user.student_profile.education_level if user.student_profile else None
    assessments = db.scalars(
        select(Assessment).options(selectinload(Assessment.questions)).where(Assessment.is_published.is_(True))
    ).all()
    results = db.scalars(
        select(AssessmentResult).where(AssessmentResult.user_id == user.id).order_by(AssessmentResult.created_at.desc())
    ).all()
    out = []
    for a in assessments:
        mine = [r for r in results if r.assessment_id == a.id]
        done = [r for r in mine if r.completed_at is not None]
        open_ = next((r for r in mine if r.completed_at is None and not _is_expired(a, r, grace_s=0)), None)
        out.append(AssessmentCard(
            id=str(a.id), title=a.title, topic=a.topic, level=a.level, is_placement=a.is_placement, is_demo=a.is_demo,
            question_count=len(a.questions), time_limit_min=a.time_limit_min, attempts=len(done),
            best_percent=max((round(100 * r.score / r.max_score) for r in done if r.max_score), default=None),
            last_result_id=str(done[0].id) if done else None,
            in_progress_attempt_id=str(open_.id) if open_ else None,
        ))
    # Placement first, then the student's own level, then general/other levels.
    out.sort(key=lambda c: (not c.is_placement, c.level != level, c.level is None, c.title))
    return out


@router.post("/{assessment_id}/start", response_model=AttemptOut)
def start_attempt(assessment_id: uuid.UUID, user: StudentUser, db: DbSession):
    a = _get_published(db, assessment_id)
    if not a.questions:
        raise ApiError(409, "assessment_empty", "This assessment has no questions yet.")
    open_attempts = db.scalars(select(AssessmentResult).where(
        AssessmentResult.user_id == user.id, AssessmentResult.assessment_id == a.id, AssessmentResult.completed_at.is_(None)
    )).all()
    attempt = None
    for r in open_attempts:
        if _is_expired(a, r, grace_s=0):
            _finalize(db, user, a, r, {})  # time ran out with nothing submitted
        elif attempt is None:
            attempt = r  # resume
    if attempt is None:
        attempt = AssessmentResult(user_id=user.id, assessment_id=a.id, score=0, max_score=len(a.questions), answers={},
                                   topic_breakdown={})
        db.add(attempt)
    db.commit()
    return AttemptOut(
        attempt_id=str(attempt.id), assessment_id=str(a.id), title=a.title, topic=a.topic, is_placement=a.is_placement,
        is_demo=a.is_demo, started_at=_aware(attempt.created_at), expires_at=_expires_at(a, attempt),
        questions=[QuestionOut(id=str(q.id), prompt=q.prompt, options=q.options, topic_tag=q.topic_tag) for q in a.questions],
    )


@router.post("/attempts/{attempt_id}/submit", response_model=ResultOut)
def submit_attempt(attempt_id: uuid.UUID, body: SubmitIn, user: StudentUser, db: DbSession):
    r = _own_attempt(db, user, attempt_id)
    if r.completed_at is not None:
        raise ApiError(409, "already_submitted", "This attempt was already submitted.")
    a = _get_published(db, r.assessment_id)
    if _is_expired(a, r):
        _finalize(db, user, a, r, {})
        db.commit()
        raise ApiError(409, "attempt_expired", "Time ran out for this attempt, so it was closed. You can start a new one.")
    _finalize(db, user, a, r, {str(k): v for k, v in body.answers.items()})
    db.commit()
    return _result_out(db, user, a, r)


@router.get("/results/{result_id}", response_model=ResultOut)
def get_result(result_id: uuid.UUID, user: StudentUser, db: DbSession):
    r = _own_attempt(db, user, result_id)
    if r.completed_at is None:
        raise ApiError(409, "not_submitted", "This attempt hasn't been submitted yet.")
    a = db.scalar(select(Assessment).options(selectinload(Assessment.questions)).where(Assessment.id == r.assessment_id))
    if not a:
        raise ApiError(404, "assessment_not_found", "Assessment not found.")
    return _result_out(db, user, a, r)


def _result_out(db: Session, user: User, a: Assessment, r: AssessmentResult) -> ResultOut:
    topics_raw: dict = (r.topic_breakdown or {}).get("topics", {})
    strengths, weaknesses = strengths_weaknesses(topics_raw)
    profile = user.student_profile
    level = profile.education_level if profile else None

    # Suggestions: placement -> courses at the recommended level; topic test -> courses for weak topics.
    q = select(Course).where(Course.is_published.is_(True)).order_by(Course.order_index)
    if a.is_placement and r.recommended_level:
        candidates = db.scalars(q.where(Course.level == r.recommended_level)).all()
    else:
        cats = set(weaknesses) or ({a.topic} if r.max_score and 100 * r.score / r.max_score < 80 else set())
        candidates = [c for c in db.scalars(q).all() if c.category in cats]
        candidates.sort(key=lambda c: c.level != level)
    progress = load_progress(db, user.id)
    counts = lesson_counts(db)
    answers = r.answers or {}
    return ResultOut(
        result_id=str(r.id), assessment_id=str(a.id), title=a.title, is_placement=a.is_placement,
        score=r.score, max_score=r.max_score, percent=round(100 * r.score / r.max_score) if r.max_score else 0,
        completed_at=_aware(r.completed_at),
        topics=[TopicScore(topic=t, correct=b["correct"], total=b["total"], percent=pct(b)) for t, b in sorted(topics_raw.items())],
        strengths=strengths, weaknesses=weaknesses, recommended_level=r.recommended_level, current_level=level,
        suggested_courses=[course_card(c, counts, progress) for c in candidates[:3]],
        review=[
            ReviewItem(question_id=str(q.id), prompt=q.prompt, options=q.options, your_answer=answers.get(str(q.id)),
                       is_correct=answers.get(str(q.id)) == q.correct_option, explanation=q.explanation)
            for q in a.questions
        ],
    )
