"""Opportunity Hub: student-facing serialization and the opportunity matcher.

The matcher is deterministic and rule-based: it only ranks opportunities an admin has verified,
using the student's level, interests and assessment results. It never generates opportunity
details, so it cannot invent scholarships, deadlines or links.
"""

import math
import re
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Application, AssessmentResult, Opportunity, SavedOpportunity, User
from app.models.enums import EducationLevel, OpportunityCategory as C, VerificationStatus
from app.schemas.opportunity import CATEGORY_LABELS, ApplicationOut, MatchOut, OpportunityOut

LEVEL_LABELS = {EducationLevel.school: "school", EducationLevel.college: "college", EducationLevel.university: "university"}

COMPETITIONS = {C.national_competition, C.international_competition, C.hackathon, C.ai_olympiad}
FINANCIAL = {C.gov_scholarship, C.private_scholarship, C.merit_scholarship, C.financial_assistance, C.stipend}
TECH = COMPETITIONS | {C.research, C.internship}

# Onboarding interest -> categories it makes relevant (lower-cased keys).
INTEREST_CATEGORIES: dict[str, set[C]] = {
    "ai": TECH,
    "artificial intelligence": TECH,
    "python": TECH,
    "machine learning": TECH,
    "data science": TECH,
    "web development": {C.hackathon, C.national_competition, C.internship},
    "robotics": COMPETITIONS,
    "mathematics": {C.ai_olympiad, C.national_competition, C.international_competition, C.research},
    "research": {C.research},
    "entrepreneurship": {C.hackathon, C.national_competition, C.internship},
    "design": {C.hackathon, C.cultural, C.internship},
    "competitions": COMPETITIONS | {C.cultural, C.sports},
    "study abroad": {C.study_abroad, C.gov_scholarship, C.private_scholarship, C.merit_scholarship},
    "sports": {C.sports},
    "culture": {C.cultural},
}

def _display(interest: str) -> str:
    """Interests are stored lower-cased: "ai" -> "AI", "machine learning" -> "Machine Learning"."""
    return interest.upper() if len(interest) <= 3 else interest.title()


STRONG_RESULT_PCT = 75
SOON_DAYS = 30


def aware(dt: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes; everything is stored in UTC."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def _days_left(deadline: datetime | None, now: datetime) -> int | None:
    if deadline is None:
        return None
    return max(0, math.floor((deadline - now).total_seconds() / 86400))


@dataclass
class StudentState:
    saved: set[uuid.UUID] = field(default_factory=set)
    applications: dict[uuid.UUID, Application] = field(default_factory=dict)


def load_state(db: Session, user_id: uuid.UUID) -> StudentState:
    saved = set(db.scalars(select(SavedOpportunity.opportunity_id).where(SavedOpportunity.user_id == user_id)))
    apps = {a.opportunity_id: a for a in db.scalars(select(Application).where(Application.user_id == user_id))}
    return StudentState(saved=saved, applications=apps)


def application_out(a: Application) -> ApplicationOut:
    return ApplicationOut(status=a.status, notes=a.notes, applied_at=aware(a.applied_at), updated_at=aware(a.updated_at))


def opportunity_out(o: Opportunity, state: StudentState, now: datetime | None = None) -> OpportunityOut:
    now = now or datetime.now(UTC)
    deadline = aware(o.deadline)
    app = state.applications.get(o.id)
    return OpportunityOut(
        id=str(o.id), title=o.title, description=o.description, category=o.category,
        category_label=CATEGORY_LABELS[o.category], provider=o.provider, eligibility=o.eligibility,
        education_levels=[EducationLevel(x) for x in (o.education_levels or [])],
        deadline=deadline, days_left=_days_left(deadline, now), is_closed=bool(deadline and deadline < now),
        required_documents=list(o.required_documents or []), official_url=o.official_url,
        verified_at=aware(o.verified_at), saved=o.id in state.saved,
        application=application_out(app) if app else None,
    )


def verified_query():
    return select(Opportunity).where(Opportunity.verification_status == VerificationStatus.verified)


def get_verified(db: Session, opportunity_id: uuid.UUID) -> Opportunity | None:
    return db.scalar(verified_query().where(Opportunity.id == opportunity_id))


def is_open(o: Opportunity, now: datetime) -> bool:
    d = aware(o.deadline)
    return d is None or d >= now


def level_eligible(o: Opportunity, level: EducationLevel | None) -> bool:
    levels = o.education_levels or []
    return not levels or level is None or level.value in levels


def best_result_pct(db: Session, user_id: uuid.UUID) -> int | None:
    row = db.execute(
        select(func.max(AssessmentResult.score * 100 / func.nullif(AssessmentResult.max_score, 0))).where(
            AssessmentResult.user_id == user_id, AssessmentResult.completed_at.is_not(None)
        )
    ).scalar()
    return int(row) if row is not None else None


def match(db: Session, user: User, limit: int = 12) -> list[MatchOut]:
    profile = user.student_profile
    level = profile.education_level if profile else None
    interests = [i.strip() for i in (profile.interests if profile else []) if i and i.strip()]
    best = best_result_pct(db, user.id)
    state = load_state(db, user.id)
    now = datetime.now(UTC)

    out: list[MatchOut] = []
    for o in db.scalars(verified_query()):
        if not is_open(o, now) or not level_eligible(o, level):
            continue
        score, reasons = 0, []
        levels = o.education_levels or []
        if level and level.value in levels:
            score += 30
            reasons.append(f"Open to {LEVEL_LABELS[level]} students")
        elif not levels:
            score += 10
            reasons.append("Open to all education levels")

        text = f"{o.title} {o.description} {o.eligibility}".lower()
        matched: list[str] = []
        for interest in interests:
            key = interest.lower()
            if o.category in INTEREST_CATEGORIES.get(key, set()):
                score += 25 if not matched else 10
                matched.append(_display(interest))
            elif len(key) >= 3 and re.search(rf"\b{re.escape(key)}\b", text):
                score += 10
                matched.append(_display(interest))
        if matched:
            reasons.append("Matches your interest in " + ", ".join(matched[:3]))

        if o.category in FINANCIAL:
            score += 10
            reasons.append("Provides financial support")
        if best is not None and best >= STRONG_RESULT_PCT and o.category in COMPETITIONS:
            score += 15
            reasons.append(f"Your best assessment score ({best}%) shows you're ready to compete")

        days = _days_left(aware(o.deadline), now)
        if days is not None and days <= SOON_DAYS:
            score += 10
            reasons.append("Closes today. Apply now" if days == 0 else f"Closes in {days} day{'s' if days != 1 else ''}. Apply soon")

        out.append(MatchOut(opportunity=opportunity_out(o, state, now), score=min(score, 100), reasons=reasons))

    out.sort(key=lambda m: (-m.score, m.opportunity.deadline or datetime.max.replace(tzinfo=UTC), m.opportunity.title))
    return out[:limit]
