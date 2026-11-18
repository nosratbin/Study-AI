"""Course catalogue: seeding, "Coming soon" outlines, the digital library, related links and the roadmap."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.catalog import CATALOG, RETIRED_DEMO_SLUGS
from app.models import Course, Opportunity
from app.models.enums import OpportunityCategory, VerificationStatus
from app.seed import seed_courses
from app.seed_careers import seed_careers
from app.seed_challenges import seed_challenges
from app.seed_full_courses import CONTENT_DIR, seed_catalog

from .test_phase4 import student


def test_seed_catalog_is_idempotent_and_retires_old_demos(db_session):
    seed_courses(db_session)  # the old demo courses
    first = seed_catalog(db_session)
    assert first["created"] == len(CATALOG) and first["retired"] == len(RETIRED_DEMO_SLUGS)
    assert seed_catalog(db_session) == {"created": 0, "filled": 0, "retired": 0}

    retired = db_session.scalars(select(Course).where(Course.slug.in_(RETIRED_DEMO_SLUGS))).all()
    assert retired and not any(c.is_published for c in retired), "old demos are unpublished, not deleted"
    for c in CATALOG:
        course = db_session.scalar(select(Course).where(Course.slug == c["slug"]))
        has_file = (CONTENT_DIR / f"{c['slug']}.md").exists()
        assert bool(course.lessons) == has_file, c["slug"]
        assert (course.outline is None) == has_file, f"{c['slug']}: outline only for Coming-soon courses"
        assert course.skills and course.resources and not course.is_demo


def test_catalog_lessons_have_modules_and_valid_library_links():
    for c in CATALOG:
        # incompleteideas.net (Sutton & Barto's free book) has no valid HTTPS certificate.
        assert all(r["url"].startswith("https://") or "incompleteideas.net" in r["url"] for r in c["resources"]), c["slug"]
        if not (CONTENT_DIR / f"{c['slug']}.md").exists():
            assert c.get("outline") and all(m["lessons"] for m in c["outline"]), f"{c['slug']} needs an outline"


def test_course_detail_coming_soon_and_related_links(client, db_session):
    seed_catalog(db_session)
    seed_challenges(db_session)
    seed_careers(db_session)
    now = datetime.now(UTC)
    db_session.add_all([
        Opportunity(title="ML hackathon", description="d", category=OpportunityCategory.hackathon, provider="p", eligibility="e",
                    official_url="https://example.org", deadline=now + timedelta(days=10), tags=["machine-learning"],
                    verification_status=VerificationStatus.verified, education_levels=["college"]),
        Opportunity(title="Unverified ML", description="d", category=OpportunityCategory.hackathon, provider="p", eligibility="e",
                    official_url="https://example.org", deadline=now + timedelta(days=5), tags=["machine-learning"]),
        Opportunity(title="Closed ML", description="d", category=OpportunityCategory.hackathon, provider="p", eligibility="e",
                    official_url="https://example.org", deadline=now - timedelta(days=1), tags=["machine-learning"],
                    verification_status=VerificationStatus.verified),
    ])
    db_session.commit()
    student(client)  # college student

    cards = {c["slug"]: c for c in client.get("/api/courses").json()}
    assert cards["python-oop-college"]["coming_soon"] is False
    assert cards["sql-databases-college"]["coming_soon"] is True
    assert not set(RETIRED_DEMO_SLUGS) & set(cards)

    soon = client.get("/api/courses/sql-databases-college").json()
    assert soon["lessons"] == [] and soon["outline"] and soon["outline"][0]["lessons"]

    ml = client.get("/api/courses/ml-regression-classification-college").json()
    assert ml["lessons"] and ml["outline"] == [] and ml["resources"] and "machine-learning" in ml["skills"]
    assert ml["related_projects"] and len(ml["related_projects"]) <= 3
    assert any(c["slug"] == "ai-ml-engineer" for c in ml["related_careers"])
    assert [o["title"] for o in ml["related_opportunities"]] == ["ML hackathon"], "only open, verified, level-eligible"


def test_roadmap_skips_empty_stages(client, db_session):
    seed_catalog(db_session)
    student(client)
    road = client.get("/api/learning/roadmap").json()
    current = [s for s in road["stages"] if s["status"] == "current"]
    assert len(current) == 1 and sum(c["lesson_count"] for c in current[0]["courses"]) > 0
    for s in road["stages"]:
        if s["status"] != "locked" and s["courses"] and not sum(c["lesson_count"] for c in s["courses"]):
            assert s["status"] == "upcoming" and all(c["coming_soon"] for c in s["courses"])


def test_seeded_opportunities_are_verified_sourced_and_linked(client, db_session):
    from app.seed_opportunities import OPPORTUNITIES, seed_opportunities

    assert seed_opportunities(db_session) == len(OPPORTUNITIES)
    assert seed_opportunities(db_session) == 0
    rows = db_session.scalars(select(Opportunity)).all()
    assert all(o.verification_status == VerificationStatus.verified and len(o.source_note or "") > 20 and o.tags
               and o.official_url.startswith("https://") for o in rows)
    seed_catalog(db_session)
    student(client, interests=["ai", "python"])  # college
    hub = client.get("/api/opportunities").json()
    items = hub["items"] if isinstance(hub, dict) else hub
    assert any(o["tags"] for o in items)
    ml = client.get("/api/courses/ml-regression-classification-college").json()
    assert any("AI Olympiad" in o["title"] for o in ml["related_opportunities"])
