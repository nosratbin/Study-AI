"""Phase 5: notifications, teacher and admin dashboards, course authoring, Career Navigator."""

from datetime import UTC, datetime, timedelta

from app.core.security import create_token, hash_password
from app.main import app
from app.models import AuditLog, Career, Notification, Opportunity, Role, SavedOpportunity, TeacherProfile, User
from app.models.enums import OpportunityCategory, VerificationStatus
from app.seed import seed_courses
from app.seed_careers import seed_careers
from app.services.llm import get_llm

from .fakes import FakeLLM
from .test_phase4 import logout, staff, student


def teacher(db_session, email="teacher@example.com", verified=True) -> tuple[dict, User]:
    u = User(email=email, full_name="Rina Teacher", role=Role.teacher, password_hash=hash_password("secret123"))
    u.teacher_profile = TeacherProfile(is_verified=verified)
    db_session.add(u)
    db_session.commit()
    return {"Authorization": f"Bearer {create_token(u.id, u.role, 0, 'access')}"}, u


def me(db_session, email="ayesha@example.com") -> User:
    return db_session.query(User).filter_by(email=email).one()


# ---------- notifications ----------


def test_notifications_owner_scoped_read_and_soft_delete(client, db_session):
    student(client)
    u = me(db_session)
    other = User(email="x@example.com", full_name="Other", role=Role.student)
    db_session.add(other)
    db_session.commit()
    mine = Notification(user_id=u.id, title="Hello", body="", kind="info")
    theirs = Notification(user_id=other.id, title="Private", body="", kind="info")
    db_session.add_all([mine, theirs])
    db_session.commit()

    r = client.get("/api/notifications").json()
    assert r["unread"] == 1 and [n["title"] for n in r["items"]] == ["Hello"]
    assert client.post(f"/api/notifications/{theirs.id}/read").status_code == 404
    assert client.delete(f"/api/notifications/{theirs.id}").status_code == 404
    assert client.post(f"/api/notifications/{mine.id}/read").json()["read_at"]
    assert client.get("/api/notifications/unread-count").json() == {"unread": 0}
    assert client.delete(f"/api/notifications/{mine.id}").status_code == 204
    assert client.get("/api/notifications").json()["items"] == []
    assert client.post(f"/api/notifications/{mine.id}/read").status_code == 404


def test_deadline_reminder_created_once_and_stays_dismissed(client, db_session):
    student(client)
    u = me(db_session)
    now = datetime.now(UTC)
    soon = Opportunity(title="Verified olympiad", description="d", category=OpportunityCategory.ai_olympiad, provider="p",
                       eligibility="e", official_url="https://example.org", deadline=now + timedelta(days=2),
                       verification_status=VerificationStatus.verified)
    unverified = Opportunity(title="Unverified", description="d", category=OpportunityCategory.hackathon, provider="p",
                             eligibility="e", official_url="https://example.org", deadline=now + timedelta(days=1))
    later = Opportunity(title="Later", description="d", category=OpportunityCategory.hackathon, provider="p", eligibility="e",
                        official_url="https://example.org", deadline=now + timedelta(days=20), verification_status=VerificationStatus.verified)
    db_session.add_all([soon, unverified, later])
    db_session.flush()
    db_session.add_all([SavedOpportunity(user_id=u.id, opportunity_id=o.id) for o in (soon, unverified, later)])
    db_session.commit()

    items = client.get("/api/notifications").json()["items"]
    assert len(items) == 1 and items[0]["kind"] == "deadline" and "Verified olympiad" in items[0]["title"]
    assert items[0]["link"] == f"/opportunities-hub/{soon.id}"
    client.get("/api/notifications/unread-count")
    assert len(client.get("/api/notifications").json()["items"]) == 1, "no duplicates on repeat syncs"
    client.delete(f"/api/notifications/{items[0]['id']}")
    assert client.get("/api/notifications").json()["items"] == [], "a dismissed reminder never comes back"


def test_review_and_verification_notify_the_student(client, db_session):
    from app.models import SkillRecord

    student(client)
    u = me(db_session)
    rec = SkillRecord(user_id=u.id, kind="award", title="Science fair", evidence_url="https://example.org/e")
    db_session.add(rec)
    db_session.commit()
    admin = staff(db_session)
    client.post(f"/api/admin/skill-records/{rec.id}/verify", json={"status": "verified", "review_note": "Checked"}, headers=admin)
    n = db_session.query(Notification).filter_by(user_id=u.id, kind="achievement").one()
    assert "verified" in n.title and n.link == "/passport"


def test_announcement_targets_audience_and_is_audited(client, db_session):
    student(client, email="s1@example.com")
    logout(client)
    student(client, email="s2@example.com", education_level="school")
    logout(client)
    t_headers, _ = teacher(db_session)
    admin = staff(db_session)
    r = client.post("/api/admin/announcements", json={"title": "Exam week", "audience": "students", "level": "college"}, headers=admin)
    assert r.status_code == 201 and r.json() == {"sent": 1}
    r = client.post("/api/admin/announcements", json={"title": "Staff meeting", "audience": "teachers", "link": "/dashboard"}, headers=admin)
    assert r.json()["sent"] == 2  # the teacher and the admin
    assert client.post("/api/admin/announcements", json={"title": "Bad", "link": "https://evil.example"}, headers=admin).status_code == 422
    assert client.post("/api/admin/announcements", json={"title": "Bad", "link": "//evil.example"}, headers=admin).status_code == 422
    assert client.post("/api/admin/announcements", json={"title": "Nope"}, headers=t_headers).status_code == 403
    assert db_session.query(AuditLog).filter_by(action="announcement.send").count() == 2


# ---------- teacher ----------


def test_teacher_dashboard_and_students_hide_private_data(client, db_session):
    seed_courses(db_session)
    student(client)
    course = client.get("/api/courses?level=college").json()[0]
    lesson = client.get(f"/api/courses/{course['slug']}").json()["lessons"][0]
    client.post("/api/learning/progress", json={"lesson_id": lesson["id"], "status": "completed"})
    client.post("/api/mindcare/checkin", json={"mood": 1, "note": "secret"})
    logout(client)

    t, _ = teacher(db_session)
    d = client.get("/api/teacher/dashboard", headers=t).json()
    assert d["stats"]["students"] == 1 and d["stats"]["lessons_completed_7d"] == 1
    assert len(d["activity"]) == 14 and d["activity"][-1]["count"] == 1
    assert any(c["learners"] == 1 for c in d["courses"])

    r = client.get("/api/teacher/students?q=ayesha", headers=t)
    rows = r.json()
    assert r.headers["X-Total-Count"] == "1" and rows[0]["lessons_completed"] == 1
    assert "email" not in rows[0] and "ayesha@example.com" not in r.text
    detail = client.get(f"/api/teacher/students/{rows[0]['id']}", headers=t)
    assert detail.status_code == 200 and "secret" not in detail.text and "mood" not in detail.text
    assert client.get("/api/teacher/students?q=%25", headers=t).json() == [], "LIKE wildcards are escaped"


def test_unverified_teacher_cannot_see_students_or_publish(client, db_session):
    t, _ = teacher(db_session, verified=False)
    assert client.get("/api/teacher/dashboard", headers=t).status_code == 200
    assert client.get("/api/teacher/students", headers=t).json()["error"]["code"] == "teacher_not_verified"
    assert client.post("/api/teacher/courses", json={"title": "My course", "level": "college"}, headers=t).status_code == 403


def test_course_authoring_ownership_publish_and_announce(client, db_session):
    seed_courses(db_session)
    student(client)
    logout(client)
    t, tu = teacher(db_session)
    t2, _ = teacher(db_session, email="t2@example.com")
    admin = staff(db_session)

    c = client.post("/api/teacher/courses", json={"title": "Prompting 101!", "level": "college", "description": "Learn prompting"}, headers=t)
    assert c.status_code == 201
    c = c.json()
    assert c["slug"] == "prompting-101-college" and not c["is_published"] and c["can_edit"]
    assert client.patch(f"/api/teacher/courses/{c['id']}", json={"is_published": True}, headers=t).json()["error"]["code"] == "course_empty"

    r = client.post(f"/api/teacher/courses/{c['id']}/lessons", json={"title": "What is a prompt", "content_md": "# Hi",
                                                                      "colab_url": "https://evil.example/x"}, headers=t)
    assert r.status_code == 422
    c = client.post(f"/api/teacher/courses/{c['id']}/lessons", json={"title": "What is a prompt", "content_md": "# Hi"}, headers=t).json()
    c = client.post(f"/api/teacher/courses/{c['id']}/lessons", json={"title": "Better prompts"}, headers=t).json()
    ids = [x["id"] for x in c["lessons"]]
    assert client.put(f"/api/teacher/courses/{c['id']}/lesson-order", json={"lesson_ids": ids[:1]}, headers=t).status_code == 422
    c = client.put(f"/api/teacher/courses/{c['id']}/lesson-order", json={"lesson_ids": ids[::-1]}, headers=t).json()
    assert [x["title"] for x in c["lessons"]] == ["Better prompts", "What is a prompt"]

    # other teachers can't edit; nobody but admins edits demo courses
    assert client.patch(f"/api/teacher/courses/{c['id']}", json={"title": "Hijack"}, headers=t2).status_code == 403
    assert client.patch(f"/api/teacher/lessons/{ids[0]}", json={"title": "Hijack"}, headers=t2).status_code == 403
    demo = next(x for x in client.get("/api/teacher/courses", headers=t).json() if x["is_demo"])
    assert not demo["can_edit"]
    assert client.patch(f"/api/teacher/courses/{demo['id']}", json={"title": "Edited"}, headers=t).status_code == 403
    assert client.patch(f"/api/teacher/courses/{demo['id']}", json={"estimated_hours": 3}, headers=admin).status_code == 200

    # publish -> visible to students + one announcement; republish doesn't announce again
    long_title = "A" * 200
    client.patch(f"/api/teacher/courses/{c['id']}", json={"title": long_title}, headers=t)
    assert client.patch(f"/api/teacher/courses/{c['id']}", json={"is_published": True}, headers=t).json()["is_published"]
    s = me(db_session)
    notes = db_session.query(Notification).filter_by(user_id=s.id).all()
    assert len(notes) == 1 and len(notes[0].title) <= 200 and notes[0].link == f"/learn/{c['slug']}"
    client.patch(f"/api/teacher/courses/{c['id']}", json={"is_published": False}, headers=t)
    client.patch(f"/api/teacher/courses/{c['id']}", json={"is_published": True}, headers=t)
    assert db_session.query(Notification).filter_by(user_id=s.id).count() == 1

    # can't delete lessons/courses students have started
    from app.core.security import create_token as tok

    sh = {"Authorization": f"Bearer {tok(s.id, s.role, s.token_version, 'access')}"}
    assert client.post("/api/learning/progress", json={"lesson_id": ids[1], "status": "completed"}, headers=sh).status_code == 200
    assert client.delete(f"/api/teacher/lessons/{ids[1]}", headers=t).json()["error"]["code"] == "lesson_in_use"
    assert client.delete(f"/api/teacher/courses/{c['id']}", headers=t).json()["error"]["code"] == "course_in_use"
    assert db_session.query(AuditLog).filter(AuditLog.actor_id == tu.id, AuditLog.action.like("course.%")).count() >= 4


# ---------- admin ----------


def test_admin_dashboard_and_user_management(client, db_session):
    student(client)
    logout(client)
    admin = staff(db_session)
    a = db_session.query(User).filter_by(email="admin@example.com").one()
    d = client.get("/api/admin/dashboard", headers=admin).json()
    assert d["stats"]["students"] == 1 and d["stats"]["admins"] == 1 and len(d["signups"]) == 30
    assert {x["label"] for x in d["students_by_level"]} >= {"school", "college", "university"}

    page = client.get("/api/admin/users?q=AYESHA", headers=admin).json()
    assert page["total"] == 1 and page["items"][0]["email"] == "ayesha@example.com"
    uid = page["items"][0]["id"]
    s = me(db_session)
    old_version = s.token_version

    r = client.patch(f"/api/admin/users/{uid}", json={"role": "teacher"}, headers=admin).json()
    assert r["role"] == "teacher" and r["teacher_verified"] is False
    db_session.refresh(s)
    assert s.token_version == old_version + 1, "role change ends old sessions"
    assert client.patch(f"/api/admin/users/{uid}", json={"teacher_verified": True}, headers=admin).json()["teacher_verified"] is True
    assert client.patch(f"/api/admin/users/{uid}", json={"is_active": False}, headers=admin).json()["is_active"] is False
    assert client.patch(f"/api/admin/users/{a.id}", json={"role": "student"}, headers=admin).status_code == 403
    assert client.patch(f"/api/admin/users/{a.id}", json={"is_active": False}, headers=admin).status_code == 403
    audit = client.get("/api/admin/audit?action=user.", headers=admin).json()
    assert len(audit) == 3 and audit[0]["actor_name"] == "Staff admin"
    t, _ = teacher(db_session, email="t9@example.com")
    assert client.get("/api/admin/users", headers=t).status_code == 403


# ---------- careers ----------


def test_careers_match_gap_goals_and_plan(client, db_session):
    seed_courses(db_session)
    seed_careers(db_session)
    db_session.add(Career(slug="hidden", title="Hidden", field="x", summary="s", is_published=False))
    student(client)  # interests: python, ai
    cards = client.get("/api/careers").json()
    assert cards and all(c["is_demo"] for c in cards) and "hidden" not in [c["slug"] for c in cards]
    assert cards == sorted(cards, key=lambda c: (-c["match"], c["title"]))
    top = cards[0]
    assert top["match"] > 0 and any("interested" in r for r in top["reasons"])
    assert client.get("/api/careers/hidden").status_code == 404

    d = client.get("/api/careers/ai-ml-engineer").json()
    assert not any(s["have"] for s in d["skills"])
    lessons = client.get("/api/courses/python-fundamentals-college").json()["lessons"]
    for lesson in lessons:
        client.post("/api/learning/progress", json={"lesson_id": lesson["id"], "status": "completed"})
    d2 = client.get("/api/careers/ai-ml-engineer").json()
    py = next(s for s in d2["skills"] if s["name"] == "Python programming")
    assert py["have"] and "Python Fundamentals" in py["evidence"] and d2["match"] > d["match"]
    assert next(c for c in d2["courses"] if c["slug"] == "python-fundamentals-college")["status"] == "completed"

    for slug in ("ai-ml-engineer", "data-analyst", "software-developer"):
        assert client.put(f"/api/careers/{slug}/goal", json={"note": "maybe"}).status_code == 200
    assert client.put("/api/careers/ai-ml-engineer/goal", json={"note": "first choice"}).json()["goal_note"] == "first choice"
    assert client.put("/api/careers/ux-designer/goal", json={}).json()["error"]["code"] == "too_many_goals"
    assert client.delete("/api/careers/data-analyst/goal").status_code == 204
    assert client.put("/api/careers/ux-designer/goal", json={}).json()["is_goal"] is True

    fake = FakeLLM(quiz={"steps": [{"title": "Finish ML course", "detail": "Do the lessons."}, {"title": "", "detail": "dropped"}]})
    app.dependency_overrides[get_llm] = lambda: fake
    plan = client.post("/api/careers/ai-ml-engineer/plan").json()
    assert [s["title"] for s in plan["steps"]] == ["Finish ML course"] and "official" in plan["note"]
    assert "Never invent salaries" in fake.calls[0]["system"]

    t, _ = teacher(db_session)
    assert client.get("/api/careers", headers=t).status_code == 403


def test_career_opportunities_are_verified_only(client, db_session):
    seed_careers(db_session)
    now = datetime.now(UTC)
    db_session.add_all([
        Opportunity(title="Real olympiad", description="d", category=OpportunityCategory.ai_olympiad, provider="p", eligibility="e",
                    official_url="https://example.org", deadline=now + timedelta(days=30), verification_status=VerificationStatus.verified,
                    education_levels=["college"]),
        Opportunity(title="Unverified olympiad", description="d", category=OpportunityCategory.ai_olympiad, provider="p", eligibility="e",
                    official_url="https://example.org", deadline=now + timedelta(days=30)),
        Opportunity(title="Closed olympiad", description="d", category=OpportunityCategory.ai_olympiad, provider="p", eligibility="e",
                    official_url="https://example.org", deadline=now - timedelta(days=1), verification_status=VerificationStatus.verified),
        Opportunity(title="School olympiad", description="d", category=OpportunityCategory.ai_olympiad, provider="p", eligibility="e",
                    official_url="https://example.org", verification_status=VerificationStatus.verified, education_levels=["school"]),
    ])
    db_session.commit()
    student(client)
    titles = [o["title"] for o in client.get("/api/careers/ai-ml-engineer").json()["opportunities"]]
    assert titles == ["Real olympiad"]


# ---------- review batch 3 regressions ----------


def test_unverified_teacher_cannot_edit_live_courses_or_review_projects(client, db_session):
    seed_courses(db_session)
    t, tu = teacher(db_session)
    c = client.post("/api/teacher/courses", json={"title": "Live course", "level": "college"}, headers=t).json()
    c = client.post(f"/api/teacher/courses/{c['id']}/lessons", json={"title": "One"}, headers=t).json()
    client.patch(f"/api/teacher/courses/{c['id']}", json={"is_published": True}, headers=t)
    tu.teacher_profile.is_verified = False  # an admin revoked verification
    db_session.commit()
    lid = c["lessons"][0]["id"]
    for method, path, body in [
        ("PATCH", f"/api/teacher/courses/{c['id']}", {"title": "Changed"}),
        ("POST", f"/api/teacher/courses/{c['id']}/lessons", {"title": "Two"}),
        ("PATCH", f"/api/teacher/lessons/{lid}", {"title": "Changed"}),
        ("DELETE", f"/api/teacher/lessons/{lid}", None),
        ("PUT", f"/api/teacher/courses/{c['id']}/lesson-order", {"lesson_ids": [lid]}),
        ("DELETE", f"/api/teacher/courses/{c['id']}", None),
        ("GET", "/api/projects/review-queue", None),
    ]:
        r = client.request(method, path, json=body, headers=t)
        assert r.status_code == 403 and r.json()["error"]["code"] == "teacher_not_verified", (method, path)
    # The read-only view tells the UI to hide the authoring controls up front.
    assert client.get(f"/api/teacher/courses/{c['id']}", headers=t).json()["can_edit"] is False


def test_project_review_and_certificate_notify(client, db_session):
    from app.models import Course
    from app.seed_challenges import seed_challenges

    seed_courses(db_session)
    seed_challenges(db_session)
    student(client)
    u = me(db_session)
    ch = client.get("/api/projects/challenges?level=college").json()[0]
    p = client.post("/api/projects", json={"title": "Quiz", "challenge_id": ch["id"], "colab_url": "https://colab.research.google.com/drive/x",
                                           "documentation": "A " * 60}).json()
    assert client.post(f"/api/projects/{p['id']}/submit").json()["status"] == "submitted"
    course = db_session.query(Course).filter_by(level="college").order_by(Course.order_index).first()
    for lesson in course.lessons:
        client.post("/api/learning/progress", json={"lesson_id": str(lesson.id), "status": "completed"})
    t, _ = teacher(db_session)
    assert client.post(f"/api/projects/{p['id']}/review", json={"feedback": "Nicely explained!"}, headers=t).status_code == 200
    kinds = {n.kind: n.link for n in db_session.query(Notification).filter_by(user_id=u.id)}
    assert kinds["project"] == f"/projects/{p['id']}" and kinds["certificate"] == "/passport"


def test_deactivated_user_token_stops_working_and_teacher_reverification(client, db_session):
    student(client)
    s = me(db_session)
    sh = {"Authorization": f"Bearer {create_token(s.id, s.role, s.token_version, 'access')}"}
    assert client.get("/api/auth/me", headers=sh).status_code == 200
    admin = staff(db_session)
    client.patch(f"/api/admin/users/{s.id}", json={"is_active": False}, headers=admin)
    logout(client)
    assert client.get("/api/auth/me", headers=sh).status_code == 401

    _, tu = teacher(db_session, email="tv@example.com")
    client.patch(f"/api/admin/users/{tu.id}", json={"role": "student"}, headers=admin)
    r = client.patch(f"/api/admin/users/{tu.id}", json={"role": "teacher"}, headers=admin).json()
    assert r["teacher_verified"] is False, "an old verification doesn't silently come back"
    assert client.patch(f"/api/admin/users/{tu.id}", json={"role": "admin"}, headers=admin).json()["role"] == "admin"


def test_skill_evidence_matches_whole_words_and_needs_enough_questions(db_session):
    from app.services.careers import Evidence, _skill_evidence

    skill = {"name": "Version control", "tags": ["git"]}
    assert _skill_evidence(skill, Evidence(achievements=[("digital bangladesh essay", True)])) is None
    assert _skill_evidence(skill, Evidence(achievements=[("my git workshop", False), ("git club lead", True)])) == "Verified achievement"
    assert _skill_evidence({"name": "ML", "tags": ["machine_learning"]},
                           Evidence(achievements=[("machine learning bootcamp", False)])) == "Your achievement (self-reported)"


def test_strong_topic_requires_three_questions(client, db_session):
    from app.models import Assessment, AssessmentResult
    from app.services.careers import load_evidence

    student(client)
    u = me(db_session)
    a = Assessment(title="Check", topic="mixed", is_published=True)
    db_session.add(a)
    db_session.flush()
    db_session.add(AssessmentResult(user_id=u.id, assessment_id=a.id, score=4, max_score=5, completed_at=datetime.now(UTC),
                                    topic_breakdown={"topics": {"python": {"correct": 1, "total": 1}, "ml": {"correct": 3, "total": 4}}}))
    db_session.commit()
    assert load_evidence(db_session, u).strong_topics == {"ml"}


def test_goal_cap_ignores_unpublished_and_plan_drops_invented_facts(client, db_session):
    seed_careers(db_session)
    student(client)
    for slug in ("ai-ml-engineer", "data-analyst", "software-developer"):
        client.put(f"/api/careers/{slug}/goal", json={})
    db_session.query(Career).filter_by(slug="data-analyst").update({"is_published": False})
    db_session.commit()
    assert client.put("/api/careers/ux-designer/goal", json={}).status_code == 200

    fake = FakeLLM(quiz={"steps": [
        {"title": "Learn Python", "detail": "Finish the Python course and build two small projects."},
        {"title": "Apply early", "detail": "Apply before 15 March at https://example.org."},
        {"title": "Expect pay", "detail": "Starting salary is about ৳40,000."},
        {"title": "Admission", "detail": "You need GPA 5 to get in."},
    ]})
    app.dependency_overrides[get_llm] = lambda: fake
    plan = client.post("/api/careers/ai-ml-engineer/plan").json()
    assert [s["title"] for s in plan["steps"]] == ["Learn Python"]
    fake.quiz = {"steps": [{"title": "Deadline", "detail": "Submit by March 3"}]}
    assert client.post("/api/careers/ai-ml-engineer/plan").status_code == 502
    fake.blocked = True
    assert client.post("/api/careers/ai-ml-engineer/plan").status_code == 422
