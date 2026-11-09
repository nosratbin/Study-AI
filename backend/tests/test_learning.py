from app.models import Course, Lesson, Role, User
from app.seed import seed_courses
from tests.conftest import ONBOARDING, register


def _student(client, db_session, level="college"):
    seed_courses(db_session)
    register(client)
    client.post("/api/students/onboarding", json={**ONBOARDING, "education_level": level})


def test_courses_require_auth(client):
    assert client.get("/api/courses").status_code == 401


def test_list_and_filter_courses(client, db_session):
    _student(client, db_session)
    all_ = client.get("/api/courses").json()
    assert len(all_) == 6
    uni = client.get("/api/courses?level=university").json()
    assert uni and all(c["level"] == "university" for c in uni)
    assert client.get("/api/courses?level=bogus").status_code == 422


def test_course_detail_and_lesson_navigation(client, db_session):
    _student(client, db_session)
    c = client.get("/api/courses/python-fundamentals-college").json()
    assert c["category"] == "programming" and c["is_demo"] and len(c["lessons"]) == 4
    assert all(l["status"] == "not_started" for l in c["lessons"])
    first, second = c["lessons"][0]["id"], c["lessons"][1]["id"]
    lesson = client.get(f"/api/lessons/{first}").json()
    assert lesson["prev_lesson_id"] is None and lesson["next_lesson_id"] == second
    assert lesson["lesson_number"] == 1 and lesson["lesson_count"] == 4
    assert lesson["course_slug"] == "python-fundamentals-college" and "Variables" in lesson["content_md"]
    assert client.get("/api/courses/nope").status_code == 404


def test_unpublished_course_hidden(client, db_session):
    _student(client, db_session)
    course = db_session.query(Course).filter_by(slug="deep-learning-university").one()
    course.is_published = False
    db_session.commit()
    lesson_id = str(course.lessons[0].id)
    assert client.get("/api/courses/deep-learning-university").status_code == 404
    assert client.get(f"/api/lessons/{lesson_id}").status_code == 404
    assert client.post("/api/learning/progress", json={"lesson_id": lesson_id, "status": "completed"}).status_code == 404


def test_progress_is_sticky_and_updates_percent(client, db_session):
    _student(client, db_session)
    lessons = client.get("/api/courses/python-fundamentals-college").json()["lessons"]
    r = client.post("/api/learning/progress", json={"lesson_id": lessons[0]["id"], "status": "in_progress"})
    assert r.status_code == 200 and r.json()["status"] == "in_progress" and r.json()["course_percent"] == 0
    r = client.post("/api/learning/progress", json={"lesson_id": lessons[0]["id"], "status": "completed"})
    assert r.json()["status"] == "completed" and r.json()["course_percent"] == 25
    assert r.json()["next_lesson_id"] == lessons[1]["id"]
    # Opening it again doesn't downgrade completion.
    r = client.post("/api/learning/progress", json={"lesson_id": lessons[0]["id"], "status": "in_progress"})
    assert r.json()["status"] == "completed"
    assert client.get("/api/courses/python-fundamentals-college").json()["percent"] == 25
    assert client.get("/api/students/dashboard").json()["stats"]["lessons_completed"] == 1


def test_teacher_can_browse_but_not_record_progress(client, db_session):
    seed_courses(db_session)
    register(client, email="t@example.com")
    u = db_session.query(User).one()
    u.role = Role.teacher
    db_session.commit()
    assert client.get("/api/courses").status_code == 200
    lesson = db_session.query(Lesson).first()
    r = client.post("/api/learning/progress", json={"lesson_id": str(lesson.id), "status": "completed"})
    assert r.status_code == 403


def test_roadmap_progression(client, db_session):
    _student(client, db_session)  # college
    rm = client.get("/api/learning/roadmap").json()
    keys = [s["key"] for s in rm["stages"]]
    assert keys == ["python", "ai_fundamentals", "machine_learning", "deep_learning", "projects"]
    st = {s["key"]: s for s in rm["stages"]}
    assert rm["current_stage"] == "python" and st["python"]["status"] == "current"
    assert all(c["level"] == "college" for c in st["python"]["courses"])
    # No college ML course exists, so the nearest level's course is offered.
    assert st["machine_learning"]["courses"] and st["machine_learning"]["status"] == "upcoming"
    assert st["projects"]["status"] == "locked" and st["projects"]["available_in_phase"] == 4
    assert st["python"]["next_lesson"]["lesson_title"] == "Variables and types"

    for l in client.get("/api/courses/python-fundamentals-college").json()["lessons"]:
        client.post("/api/learning/progress", json={"lesson_id": l["id"], "status": "completed"})
    rm = client.get("/api/learning/roadmap").json()
    st = {s["key"]: s for s in rm["stages"]}
    assert st["python"]["status"] == "completed" and st["python"]["percent"] == 100
    assert rm["current_stage"] == "ai_fundamentals" and rm["overall_percent"] == 25


def test_roadmap_requires_onboarding(client, db_session):
    register(client)
    assert client.get("/api/learning/roadmap").status_code == 409
