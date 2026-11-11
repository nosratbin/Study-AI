from datetime import UTC, datetime, timedelta

from app.core.security import create_token, hash_password
from app.models import (
    LearningProgress,
    MoodCheckin,
    Opportunity,
    Role,
    SavedOpportunity,
    User,
)
from app.models.enums import OpportunityCategory, ProgressStatus, VerificationStatus
from app.seed import seed_courses

from .conftest import ONBOARDING, register


def test_onboarding_flow(client):
    register(client)
    assert client.get("/api/students/dashboard").json()["error"]["code"] == "onboarding_required"
    r = client.post("/api/students/onboarding", json=ONBOARDING)
    assert r.status_code == 200
    p = r.json()
    assert p["onboarding_completed"] is True
    assert p["is_minor"] is False
    assert p["interests"] == ["ai", "python"]  # normalised + deduplicated
    assert client.get("/api/auth/me").json()["onboarding_completed"] is True


def test_minor_requires_guardian_consent(client):
    register(client)
    year = datetime.now(UTC).year
    body = {**ONBOARDING, "education_level": "school", "birth_year": year - 13}
    r = client.post("/api/students/onboarding", json=body)
    assert r.status_code == 422 and r.json()["error"]["code"] == "guardian_consent_required"
    r = client.post("/api/students/onboarding", json={**body, "guardian_consent": True})
    assert r.status_code == 200
    assert r.json()["is_minor"] is True and r.json()["guardian_consent_given"] is True


def test_onboarding_validation(client):
    register(client)
    year = datetime.now(UTC).year
    assert client.post("/api/students/onboarding", json={**ONBOARDING, "education_level": "phd"}).status_code == 422
    assert client.post("/api/students/onboarding", json={**ONBOARDING, "birth_year": year - 3}).status_code == 422


def test_update_level_later(client):
    register(client)
    client.post("/api/students/onboarding", json=ONBOARDING)
    r = client.patch("/api/students/profile", json={"education_level": "university", "full_name": "Ayesha  R"})
    assert r.status_code == 200 and r.json()["education_level"] == "university"
    assert client.get("/api/auth/me").json()["full_name"] == "Ayesha R"
    assert client.patch("/api/students/profile", json={"education_level": None}).status_code == 422


def test_dashboard_uses_level_and_progress(client, db_session):
    seed_courses(db_session)
    register(client)
    client.post("/api/students/onboarding", json=ONBOARDING)  # college
    d = client.get("/api/students/dashboard").json()
    assert d["greeting_name"] == "Ayesha"
    assert d["recommended_courses"] and all(c["level"] == "college" for c in d["recommended_courses"])
    assert all(c["is_demo"] for c in d["recommended_courses"])
    assert d["stats"]["lessons_completed"] == 0
    assert d["continue_learning"] is not None
    assert any(m["key"] == "dashboard" and m["available"] for m in d["modules"])
    assert any(m["key"] == "ai_tutor" and m["available"] for m in d["modules"])
    assert any(m["key"] == "project_lab" and m["available"] for m in d["modules"])
    assert all(m["available"] for m in d["modules"]), "every module has shipped by phase 5"

    # Complete the first lesson of the suggested course.
    user = db_session.query(User).one()
    first = d["continue_learning"]
    import uuid

    db_session.add(LearningProgress(user_id=user.id, course_id=uuid.UUID(first["course_id"]),
                                    lesson_id=uuid.UUID(first["lesson_id"]), status=ProgressStatus.completed, percent=100))
    db_session.commit()
    d2 = client.get("/api/students/dashboard").json()
    assert d2["stats"]["lessons_completed"] == 1
    assert d2["stats"]["courses_in_progress"] == 1
    assert d2["continue_learning"]["lesson_id"] != first["lesson_id"]
    top = d2["recommended_courses"][0]
    assert top["id"] == first["course_id"] and 0 < top["percent"] < 100


def test_dashboard_deadlines_only_verified_future(client, db_session):
    register(client)
    client.post("/api/students/onboarding", json=ONBOARDING)
    user = db_session.query(User).one()
    now = datetime.now(UTC)

    def opp(title, status, delta):
        o = Opportunity(title=title, description="d", category=OpportunityCategory.hackathon, provider="p",
                        eligibility="e", official_url="https://example.org", verification_status=status,
                        deadline=now + timedelta(days=delta))
        db_session.add(o)
        db_session.flush()
        db_session.add(SavedOpportunity(user_id=user.id, opportunity_id=o.id))

    opp("verified-future", VerificationStatus.verified, 10)
    opp("unverified-future", VerificationStatus.unverified, 10)
    opp("verified-past", VerificationStatus.verified, -1)
    db_session.commit()
    d = client.get("/api/students/dashboard").json()
    assert [x["title"] for x in d["upcoming_deadlines"]] == ["verified-future"]


def test_dashboard_never_exposes_mood_data(client, db_session):
    register(client)
    client.post("/api/students/onboarding", json=ONBOARDING)
    user = db_session.query(User).one()
    db_session.add(MoodCheckin(user_id=user.id, mood=1, note="very private note"))
    db_session.commit()
    r = client.get("/api/students/dashboard")
    assert "very private note" not in r.text and "mood" not in r.text.lower()


def test_student_routes_forbidden_for_teacher(client, db_session):
    t = User(email="t@example.com", full_name="Teacher", role=Role.teacher, password_hash=hash_password("secret123"))
    db_session.add(t)
    db_session.commit()
    token = create_token(t.id, t.role, 0, "access")
    r = client.get("/api/students/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "forbidden"


def test_students_isolated(client):
    """Each student only ever sees their own profile."""
    register(client, email="a@example.com")
    client.post("/api/students/onboarding", json={**ONBOARDING, "institution": "A School"})
    client.cookies.clear()
    register(client, email="b@example.com", name="Babul Hossain")
    assert client.get("/api/students/profile").json()["institution"] is None


def test_health_and_contact(client):
    h = client.get("/api/health").json()
    assert h["status"] == "ok" and h["integrations"]["google_signin"] is False
    ok = client.post("/api/contact", json={"name": "Rina", "email": "rina@example.com", "subject": "Hello",
                                           "message": "I would like to partner with IccheGhuri."})
    assert ok.status_code == 201
    bad = client.post("/api/contact", json={"name": "R", "email": "x", "subject": "", "message": "short"})
    assert bad.status_code == 422
