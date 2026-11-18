"""Guest mode: one-click student/teacher/admin visits for the competition."""

from datetime import UTC, datetime, timedelta

from app.models import Role, User
from app.seed import seed_courses
from app.services import guest as guest_mode

from .test_phase4 import logout, staff, student

MOBILE = {"X-Client-Type": "mobile"}


def guest(client, role, level="college") -> tuple[dict, dict]:
    r = client.post("/api/auth/guest", json={"role": role, "level": level}, headers=MOBILE)
    assert r.status_code == 200, r.text
    body = r.json()
    return {"Authorization": f"Bearer {body['access_token']}"}, body["user"]


def test_guest_student_is_throwaway_and_can_use_the_app(client, db_session):
    seed_courses(db_session)
    h1, u1 = guest(client, "student", "school")
    h2, u2 = guest(client, "student")
    assert u1["id"] != u2["id"] and u1["is_guest"] and u1["role"] == "student"
    me = client.get("/api/auth/me", headers=h1).json()
    assert me["is_guest"] and me["onboarding_completed"]
    # Students can write (progress, notes...) on their own throwaway account.
    course = client.get("/api/courses?level=school", headers=h1).json()[0]
    lesson = client.get(f"/api/courses/{course['slug']}", headers=h1).json()["lessons"][0]
    r = client.post("/api/learning/progress", json={"lesson_id": lesson["id"], "status": "completed"}, headers=h1)
    assert r.status_code in (200, 201), r.text


def test_old_guest_students_are_cleaned_up(client, db_session):
    _, old = guest(client, "student")
    u = db_session.get(User, __import__("uuid").UUID(old["id"]))
    u.created_at = datetime.now(UTC) - timedelta(hours=25)
    db_session.commit()
    guest(client, "student")
    db_session.expire_all()
    assert db_session.get(User, u.id) is None
    assert db_session.query(User).filter(User.email.like("sample-%")).count() == 0  # samples come with staff, not students


def test_guest_staff_are_shared_and_read_only(client, db_session):
    h, t = guest(client, "teacher")
    _, t2 = guest(client, "teacher")
    assert t["id"] == t2["id"] and t["role"] == "teacher"
    assert client.get("/api/teacher/dashboard", headers=h).status_code == 200
    r = client.post("/api/teacher/courses", json={"title": "Guest course", "level": "college"}, headers=h)
    assert r.status_code == 403 and r.json()["error"]["code"] == "guest_read_only"
    assert client.post("/api/auth/logout", headers=h).status_code in (200, 204)

    ha, a = guest(client, "admin")
    assert a["role"] == "admin"
    r = client.post("/api/admin/announcements", json={"title": "Hi", "audience": "students"}, headers=ha)
    assert r.json()["error"]["code"] == "guest_read_only"


def test_audience_split_between_guests_and_real_users(client, db_session):
    seed_courses(db_session)
    student(client)  # a real student with private data
    logout(client)

    ht, _ = guest(client, "teacher")
    rows = client.get("/api/teacher/students", headers=ht).json()
    names = {r["full_name"] for r in rows}
    assert len(guest_mode.SAMPLES) <= len(rows) and "Ayesha Rahman" not in names
    assert all("(sample)" in n or n == "Guest Student" for n in names)
    real = db_session.query(User).filter_by(email="ayesha@example.com").one()
    assert client.get(f"/api/teacher/students/{real.id}", headers=ht).status_code == 404
    queue = client.get("/api/projects/review-queue", headers=ht).json()
    assert queue and all("Sample" in p["description"] for p in queue)

    ha, _ = guest(client, "admin")
    users = client.get("/api/admin/users?limit=200", headers=ha).json()["items"]
    assert users and all(u["email"].endswith(guest_mode.DOMAIN) for u in users)
    assert client.get("/api/admin/audit", headers=ha).json() == []
    assert client.get("/api/admin/dashboard", headers=ha).json()["recent_audit"] == []
    records = client.get("/api/admin/skill-records", headers=ha).json()
    assert records and all("(sample)" in r["title"] for r in records)
    assert client.get("/api/admin/support-requests", headers=ha).status_code == 200

    # Real staff never see guests.
    admin = staff(db_session)
    emails = [u["email"] for u in client.get("/api/admin/users?limit=200", headers=admin).json()["items"]]
    assert "ayesha@example.com" in emails and not any(e.endswith(guest_mode.DOMAIN) for e in emails)
    assert client.get("/api/admin/skill-records", headers=admin).json() == []
    t = staff(db_session, role=Role.teacher, email="t@example.com")
    assert [r["full_name"] for r in client.get("/api/teacher/students", headers=t).json()] == ["Ayesha Rahman"]
    assert client.get("/api/projects/review-queue", headers=t).json() == []


def test_guest_access_can_be_turned_off(client, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "guest_access_enabled", False)
    assert client.post("/api/auth/guest", json={"role": "student"}).status_code == 404
