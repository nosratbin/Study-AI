"""Career Navigator: rule-based matching and skill-gap analysis (no LLM).

Evidence comes only from academic data the student created on IccheGhuri: interests, course progress, certificates,
assessment topic scores and achievements. MindCare data is never used.
"""

import re
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    AssessmentResult,
    Career,
    CareerGoal,
    Certificate,
    Course,
    LearningProgress,
    Lesson,
    Opportunity,
    SkillRecord,
    User,
)
from app.models.enums import ProgressStatus, VerificationStatus
from app.schemas.opportunity import CATEGORY_LABELS
from app.schemas.phase5 import CareerCard, CareerCourse, CareerDetail, CareerOpportunity, CareerSkill
from app.services.opportunities import _display, aware, verified_query

STRONG_TOPIC_PCT = 70
MIN_TOPIC_QUESTIONS = 3  # one lucky answer is not a strong topic
MAX_GOALS = 3


def published_careers():
    """Students only ever see published careers."""
    return select(Career).where(Career.is_published.is_(True))


@dataclass
class Evidence:
    level: str | None = None
    interests: set[str] = field(default_factory=set)
    completed_courses: dict[str, str] = field(default_factory=dict)  # slug -> title
    course_categories: set[str] = field(default_factory=set)  # categories of completed courses
    course_percent: dict[str, int] = field(default_factory=dict)  # slug -> percent for started courses
    strong_topics: set[str] = field(default_factory=set)
    achievements: list[tuple[str, bool]] = field(default_factory=list)  # (lower-case title, verified)
    goals: dict[uuid.UUID, str | None] = field(default_factory=dict)  # career_id -> note


def load_evidence(db: Session, user: User) -> Evidence:
    p = user.student_profile
    ev = Evidence(level=p.education_level if p else None, interests={i.lower() for i in (p.interests or [])} if p else set())

    for slug, title, category in db.execute(
        select(Course.slug, Course.title, Course.category).join(Certificate, Certificate.course_id == Course.id)
        .where(Certificate.user_id == user.id)
    ).all():
        ev.completed_courses[slug] = title
        ev.course_categories.add(category)

    lesson_counts = dict(db.execute(select(Lesson.course_id, func.count(Lesson.id)).group_by(Lesson.course_id)).all())
    rows = db.execute(
        select(Course.id, Course.slug, func.count(LearningProgress.id))
        .join(LearningProgress, LearningProgress.course_id == Course.id)
        .where(LearningProgress.user_id == user.id, LearningProgress.status == ProgressStatus.completed,
               LearningProgress.lesson_id.is_not(None))
        .group_by(Course.id, Course.slug)
    ).all()
    for cid, slug, done in rows:
        total = lesson_counts.get(cid, 0)
        ev.course_percent[slug] = min(100, round(100 * done / total)) if total else 0
    for slug in db.scalars(select(Course.slug).join(LearningProgress, LearningProgress.course_id == Course.id)
                           .where(LearningProgress.user_id == user.id)).all():
        ev.course_percent.setdefault(slug, 0)

    topics: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for breakdown in db.scalars(select(AssessmentResult.topic_breakdown).where(
            AssessmentResult.user_id == user.id, AssessmentResult.completed_at.is_not(None))).all():
        for topic, v in ((breakdown or {}).get("topics") or {}).items():
            if isinstance(v, dict):
                topics[topic][0] += int(v.get("correct", 0))
                topics[topic][1] += int(v.get("total", 0))
    ev.strong_topics = {t for t, (c, n) in topics.items() if n >= MIN_TOPIC_QUESTIONS and 100 * c / n >= STRONG_TOPIC_PCT}

    ev.achievements = [(t.lower(), s == VerificationStatus.verified) for t, s in db.execute(
        select(SkillRecord.title, SkillRecord.verification_status).where(
            SkillRecord.user_id == user.id, SkillRecord.verification_status != VerificationStatus.rejected)).all()]
    ev.goals = dict(db.execute(select(CareerGoal.career_id, CareerGoal.note).where(CareerGoal.user_id == user.id)).all())
    return ev


def _skill_evidence(skill: dict, ev: Evidence) -> str | None:
    tags = {str(t).lower() for t in skill.get("tags") or []}
    for slug, title in ev.completed_courses.items():
        if slug in tags:
            return f"Completed {title}"
    if hit := tags & ev.course_categories:
        return f"Completed a {_display(next(iter(hit)).replace('_', ' '))} course"
    if hit := tags & ev.strong_topics:
        return f"Strong assessment score in {_display(next(iter(hit)).replace('_', ' '))}"
    # Whole words only, so "git" doesn't match "digital" and "art" doesn't match "smart".
    words = [re.compile(rf"\b{re.escape(t.replace('_', ' '))}\b") for t in tags if len(t) >= 3]
    for title, verified in sorted(ev.achievements, key=lambda a: not a[1]):  # verified evidence first
        if any(w.search(title) for w in words):
            return "Verified achievement" if verified else "Your achievement (self-reported)"
    return None


def _score(c: Career, ev: Evidence) -> tuple[int, list[str], list[CareerSkill]]:
    reasons: list[str] = []
    interests = {i.lower() for i in c.interests or []}
    shared = sorted(interests & ev.interests)
    interest_part = 50 * min(1.0, len(shared) / 2) if interests else 0
    if shared:
        reasons.append("You're interested in " + ", ".join(_display(s) for s in shared[:3]))

    skills = [CareerSkill(name=str(s.get("name", "")), have=(e := _skill_evidence(s, ev)) is not None, evidence=e)
              for s in (c.skills or []) if isinstance(s, dict) and s.get("name")]
    have = sum(s.have for s in skills)
    skill_part = 35 * have / len(skills) if skills else 0
    if have:
        reasons.append(f"You already have {have} of {len(skills)} key skills")

    slugs = list(c.course_slugs or [])
    done = [s for s in slugs if s in ev.completed_courses]
    started = [s for s in slugs if s in ev.course_percent and s not in ev.completed_courses]
    course_part = 15 * (len(done) + 0.5 * len(started)) / len(slugs) if slugs else 0
    if done:
        reasons.append("You completed " + ", ".join(ev.completed_courses[s] for s in done[:2]))
    elif started:
        reasons.append("You've started a related course")
    if not reasons:
        reasons.append("Explore this path: no matching interests or skills yet")
    return round(interest_part + skill_part + course_part), reasons, skills


def career_card(c: Career, ev: Evidence) -> CareerCard:
    match, reasons, _ = _score(c, ev)
    return CareerCard(id=str(c.id), slug=c.slug, title=c.title, field=c.field, summary=c.summary, is_demo=c.is_demo,
                      match=match, reasons=reasons, is_goal=c.id in ev.goals)


def ranked_careers(db: Session, ev: Evidence) -> list[CareerCard]:
    careers = db.scalars(published_careers().order_by(Career.order_index, Career.title)).all()
    return sorted((career_card(c, ev) for c in careers), key=lambda x: (-x.match, x.title))


def career_detail(db: Session, c: Career, ev: Evidence) -> CareerDetail:
    match, reasons, skills = _score(c, ev)
    by_slug = {x.slug: x for x in db.scalars(select(Course).where(Course.slug.in_(list(c.course_slugs or [])),
                                                                   Course.is_published.is_(True))).all()}
    courses = []
    for slug in c.course_slugs or []:
        course = by_slug.get(slug)
        if not course:
            continue
        pct = 100 if slug in ev.completed_courses else ev.course_percent.get(slug, 0)
        status = (ProgressStatus.completed if pct >= 100 else ProgressStatus.in_progress if slug in ev.course_percent
                  else ProgressStatus.not_started)
        courses.append(CareerCourse(slug=slug, title=course.title, level=course.level, is_demo=course.is_demo, status=status, percent=pct))

    opportunities: list[CareerOpportunity] = []
    if c.opportunity_categories:
        now = datetime.now(UTC)
        rows = db.scalars(verified_query().where(Opportunity.category.in_(list(c.opportunity_categories)))).all()
        for o in sorted(rows, key=lambda o: (aware(o.deadline) is None, aware(o.deadline) or now)):
            deadline = aware(o.deadline)
            if deadline is not None and deadline < now:
                continue
            levels = list(o.education_levels or [])
            if ev.level and levels and ev.level not in levels:
                continue
            opportunities.append(CareerOpportunity(id=str(o.id), title=o.title, category_label=CATEGORY_LABELS[o.category], deadline=deadline))
            if len(opportunities) == 5:
                break

    return CareerDetail(
        id=str(c.id), slug=c.slug, title=c.title, field=c.field, summary=c.summary, is_demo=c.is_demo, match=match,
        reasons=reasons, is_goal=c.id in ev.goals, description_md=c.description_md, skills=skills,
        education_paths=list(c.education_paths or []), courses=courses, opportunities=opportunities,
        goal_note=ev.goals.get(c.id),
    )
