"""Full (non-demo) courses whose lessons live as Markdown in app/content/courses/<slug>.md.

Each file is split by marker lines:

    @module Module 1 · Getting started
    @lesson Why version control? | 15
    # Why version control?
    ...lesson Markdown...

`@module` sets the section for the lessons after it; `@lesson Title | minutes` starts a lesson.
Seeding is idempotent: a course whose slug already exists is left alone, so a teacher's edits are never overwritten.
"""

from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Course, EducationLevel, Lesson

CONTENT_DIR = Path(__file__).parent / "content" / "courses"
L = EducationLevel

FULL_COURSES: list[dict] = [
    {
        "slug": "business-fundamentals-college", "level": L.college, "category": "business", "hours": 14,
        "title": "Business Fundamentals: From Idea to Enterprise",
        "description": "How businesses work, from spotting an idea and testing it with customers to marketing, operations, "
                       "finance, ethics and writing a complete business plan, with examples from Bangladesh.",
    },
    {
        "slug": "git-github-university", "level": L.university, "category": "developer_tools", "hours": 16,
        "title": "Git & GitHub: Basic to Advanced",
        "description": "Version control from your first commit to rebasing, recovering lost work, pull requests, open-source "
                       "contribution, releases, GitHub Actions CI and repository security.",
    },
    {
        "slug": "physics-motion-force-energy-school", "level": L.school, "category": "science", "hours": 12,
        "title": "Physics (Class 9–10): Motion, Force and Energy",
        "description": "Measurement, motion, Newton's laws, momentum, friction, work, energy and power for SSC physics, "
                       "with worked examples and practice problems in every lesson.",
    },
]

ORDER_OFFSET = 100  # list full courses after the demo courses


@dataclass
class ParsedLesson:
    title: str
    minutes: int
    module: str | None
    lines: list[str] = field(default_factory=list)

    @property
    def content_md(self) -> str:
        return "\n".join(self.lines).strip() + "\n"


def parse_course_file(text: str) -> list[ParsedLesson]:
    lessons: list[ParsedLesson] = []
    module: str | None = None
    in_fence = False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
        if not in_fence and line.startswith("@module "):
            module = line.removeprefix("@module ").strip()
        elif not in_fence and line.startswith("@lesson "):
            title, _, minutes = line.removeprefix("@lesson ").rpartition("|")
            if not title:
                raise ValueError(f"@lesson needs 'Title | minutes': {line!r}")
            lessons.append(ParsedLesson(title=title.strip(), minutes=int(minutes), module=module))
        elif lessons:
            lessons[-1].lines.append(line)
        elif line.strip():
            raise ValueError(f"content before the first @lesson: {line!r}")
    if in_fence:
        raise ValueError("unclosed ``` code fence")
    return lessons


def load_lessons(slug: str) -> list[ParsedLesson]:
    return parse_course_file((CONTENT_DIR / f"{slug}.md").read_text(encoding="utf-8"))


def _lessons_from_file(course: Course) -> None:
    for j, lesson in enumerate(load_lessons(course.slug)):
        course.lessons.append(Lesson(title=lesson.title, module=lesson.module, content_md=lesson.content_md,
                                     order_index=j, duration_min=lesson.minutes))


def seed_catalog(db: Session) -> dict[str, int]:
    """Create the catalogue courses and keep their metadata (outline, skills, library) in sync. Idempotent.

    Lessons are only written when a course has none, so a teacher's edits are never overwritten. A course that was
    "Coming soon" gets its lessons once its Markdown file exists. Old demo courses are unpublished, not deleted.
    """
    from app.catalog import CATALOG, EXTRA_META, RETIRED_DEMO_SLUGS

    stats = {"created": 0, "filled": 0, "retired": 0}
    for i, c in enumerate(CATALOG):
        course = db.scalar(select(Course).where(Course.slug == c["slug"]))
        if course is None:
            course = Course(slug=c["slug"], title=c["title"], description=c["description"], level=c["level"],
                            category=c["category"], estimated_hours=c["hours"], is_published=True, is_demo=False, order_index=i)
            db.add(course)
            stats["created"] += 1
        course.skills, course.resources = c.get("skills", []), c.get("resources", [])
        has_file = (CONTENT_DIR / f"{c['slug']}.md").exists()
        if has_file and not course.lessons:
            _lessons_from_file(course)
            stats["filled"] += 1
        course.outline = None if course.lessons or has_file else c.get("outline")
    for slug, meta in EXTRA_META.items():
        if course := db.scalar(select(Course).where(Course.slug == slug)):
            course.skills, course.resources = meta["skills"], meta["resources"]
    for course in db.scalars(select(Course).where(Course.slug.in_(RETIRED_DEMO_SLUGS), Course.is_published.is_(True))):
        course.is_published = False
        stats["retired"] += 1
    db.commit()
    return stats


def seed_full_courses(db: Session) -> int:
    created = 0
    for i, c in enumerate(FULL_COURSES):
        if db.scalar(select(Course).where(Course.slug == c["slug"])):
            continue
        course = Course(
            slug=c["slug"], title=c["title"], description=c["description"], level=c["level"], category=c["category"],
            estimated_hours=c["hours"], is_published=True, is_demo=False, order_index=ORDER_OFFSET + i,
        )
        _lessons_from_file(course)
        db.add(course)
        created += 1
    db.commit()
    return created
