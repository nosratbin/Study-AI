"""Links from a course to related Project Lab challenges, careers and opportunities, by shared skill tags.

Rule-based, no LLM. Course tags are lower-case with hyphens ("machine-learning"); challenge skills are display text
("Machine learning"), so both are normalised to plain words before matching. Opportunities come only from
`verified_query()`, so students never see unverified listings.
"""

import re
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Career, Course, ProjectChallenge
from app.schemas.learning import RelatedLink
from app.services.opportunities import aware, is_open, level_eligible, verified_query

LIMIT = 3


def norm(tag: str) -> str:
    return re.sub(r"[\s_\-]+", " ", tag.strip().lower())


def course_tags(course: Course) -> set[str]:
    return {norm(t) for t in [*(course.skills or []), course.category]}


def _matches(tags: set[str], phrases: list[str]) -> int:
    """How many course tags appear as whole words in any of the phrases."""
    text = " | ".join(norm(p) for p in phrases)
    return sum(1 for t in tags if re.search(rf"\b{re.escape(t)}\b", text))


def related_projects(db: Session, course: Course) -> list[RelatedLink]:
    tags = course_tags(course)
    scored = []
    for ch in db.scalars(select(ProjectChallenge).where(ProjectChallenge.is_published.is_(True))):
        score = _matches(tags, [*(ch.skills or []), ch.title])
        if score:
            scored.append((score + (ch.level == course.level), ch))
    scored.sort(key=lambda x: (-x[0], x[1].order_index))
    return [RelatedLink(id=str(ch.id), slug=ch.slug, title=ch.title, detail=f"{ch.level.value.title()} · {ch.estimated_hours} h")
            for _, ch in scored[:LIMIT]]


def related_careers(db: Session, course: Course) -> list[RelatedLink]:
    tags = course_tags(course) | {course.slug}
    scored = []
    for c in db.scalars(select(Career).where(Career.is_published.is_(True))):
        career_tags = {norm(t) for s in (c.skills or []) if isinstance(s, dict) for t in s.get("tags") or []}
        score = 3 * (course.slug in (c.course_slugs or [])) + len(tags & career_tags)
        if score:
            scored.append((score, c))
    scored.sort(key=lambda x: (-x[0], x[1].title))
    return [RelatedLink(id=str(c.id), slug=c.slug, title=c.title, detail=c.field) for _, c in scored[:LIMIT]]


def related_opportunities(db: Session, course: Course) -> list[RelatedLink]:
    tags = course_tags(course)
    now = datetime.now(UTC)
    rows = [o for o in db.scalars(verified_query())
            if is_open(o, now) and level_eligible(o, course.level) and tags & {norm(t) for t in o.tags or []}]
    rows.sort(key=lambda o: (o.deadline is None, aware(o.deadline) or now))
    return [RelatedLink(id=str(o.id), title=o.title, detail=o.provider) for o in rows[:LIMIT]]
