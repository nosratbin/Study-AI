from datetime import UTC, datetime, timedelta

from app.models import Assessment, AssessmentResult, StudentProfile
from app.seed import seed_courses
from app.seed_assessments import ASSESSMENTS, rotate, seed_assessments
from tests.conftest import ONBOARDING, register


def _setup(client, db_session, email="ayesha@example.com"):
    seed_courses(db_session)
    seed_assessments(db_session)
    register(client, email=email)
    client.post("/api/students/onboarding", json=ONBOARDING)  # college


def _by_title(client, title):
    return next(a for a in client.get("/api/assessments").json() if a["title"] == title)


def _key(db_session, assessment_id):
    a = db_session.get(Assessment, __import__("uuid").UUID(assessment_id))
    return {str(q.id): q.correct_option for q in a.questions}, a


def test_seed_answer_keys_survive_rotation():
    for i, a in enumerate(ASSESSMENTS):
        for j, (_, options, correct, *_rest) in enumerate(a["questions"]):
            opts, key = rotate(options, correct, i * 3 + j * 5)
            assert opts[key] == options[correct]


def test_list_puts_placement_first_and_never_leaks_keys(client, db_session):
    _setup(client, db_session)
    r = client.get("/api/assessments")
    cards = r.json()
    assert cards[0]["is_placement"] and all(c["is_demo"] for c in cards)
    a = _by_title(client, "Python Basics")
    start = client.post(f"/api/assessments/{a['id']}/start")
    assert start.status_code == 200
    body = start.text
    assert "correct_option" not in body and "explanation" not in body
    assert len(start.json()["questions"]) == 8 and start.json()["expires_at"]


def test_score_from_answer_key_and_no_double_submit(client, db_session):
    _setup(client, db_session)
    a = _by_title(client, "Python Basics")
    attempt = client.post(f"/api/assessments/{a['id']}/start").json()
    key, _ = _key(db_session, a["id"])
    answers = dict(key)
    wrong_q = attempt["questions"][0]["id"]
    answers[wrong_q] = (key[wrong_q] + 1) % 4
    r = client.post(f"/api/assessments/attempts/{attempt['attempt_id']}/submit", json={"answers": answers})
    assert r.status_code == 200
    res = r.json()
    assert res["score"] == 7 and res["max_score"] == 8 and res["percent"] == 88
    assert "correct_option" not in r.text
    review = {i["question_id"]: i for i in res["review"]}
    assert review[wrong_q]["is_correct"] is False and review[wrong_q]["explanation"]
    assert "python" in res["strengths"]
    again = client.post(f"/api/assessments/attempts/{attempt['attempt_id']}/submit", json={"answers": answers})
    assert again.status_code == 409 and again.json()["error"]["code"] == "already_submitted"
    assert client.get(f"/api/assessments/results/{res['result_id']}").json()["score"] == 7
    card = _by_title(client, "Python Basics")
    assert card["attempts"] == 1 and card["best_percent"] == 88


def test_invalid_answers_are_ignored_not_scored(client, db_session):
    _setup(client, db_session)
    a = _by_title(client, "Deep Learning Basics")
    attempt = client.post(f"/api/assessments/{a['id']}/start").json()
    bogus = {q["id"]: 9 for q in attempt["questions"]}  # out-of-range option index
    bogus["00000000-0000-0000-0000-000000000000"] = 0
    res = client.post(f"/api/assessments/attempts/{attempt['attempt_id']}/submit", json={"answers": bogus}).json()
    assert res["score"] == 0 and all(i["your_answer"] is None for i in res["review"])
    assert res["weaknesses"] == ["deep_learning"]
    assert any(c["slug"] == "deep-learning-university" for c in res["suggested_courses"])


def test_other_users_attempt_is_not_found(client, db_session):
    _setup(client, db_session)
    a = _by_title(client, "Python Basics")
    attempt = client.post(f"/api/assessments/{a['id']}/start").json()
    client.cookies.clear()
    register(client, email="other@example.com")
    client.post("/api/students/onboarding", json=ONBOARDING)
    r = client.post(f"/api/assessments/attempts/{attempt['attempt_id']}/submit", json={"answers": {}})
    assert r.status_code == 404
    assert client.get(f"/api/assessments/results/{attempt['attempt_id']}").status_code == 404


def test_start_resumes_open_attempt_and_expired_attempts_close(client, db_session):
    _setup(client, db_session)
    a = _by_title(client, "Python Basics")
    first = client.post(f"/api/assessments/{a['id']}/start").json()
    assert client.post(f"/api/assessments/{a['id']}/start").json()["attempt_id"] == first["attempt_id"]
    assert _by_title(client, "Python Basics")["in_progress_attempt_id"] == first["attempt_id"]

    row = db_session.get(AssessmentResult, __import__("uuid").UUID(first["attempt_id"]))
    row.created_at = datetime.now(UTC) - timedelta(minutes=30)
    db_session.commit()
    r = client.post(f"/api/assessments/attempts/{first['attempt_id']}/submit", json={"answers": {}})
    assert r.status_code == 409 and r.json()["error"]["code"] == "attempt_expired"
    assert db_session.get(AssessmentResult, row.id).completed_at is not None
    assert client.post(f"/api/assessments/{a['id']}/start").json()["attempt_id"] != first["attempt_id"]


def test_placement_recommends_level_and_updates_profile(client, db_session):
    _setup(client, db_session)
    a = _by_title(client, "Placement Test: Where should I start?")
    attempt = client.post(f"/api/assessments/{a['id']}/start").json()
    key, model = _key(db_session, a["id"])
    easy_only = {str(q.id): q.correct_option for q in model.questions if q.difficulty == 1}
    res = client.post(f"/api/assessments/attempts/{attempt['attempt_id']}/submit", json={"answers": easy_only}).json()
    assert res["recommended_level"] == "school" and res["current_level"] == "college"
    assert all(c["level"] == "school" for c in res["suggested_courses"])

    attempt = client.post(f"/api/assessments/{a['id']}/start").json()
    res = client.post(f"/api/assessments/attempts/{attempt['attempt_id']}/submit", json={"answers": key}).json()
    assert res["recommended_level"] == "university" and res["percent"] == 100
    assert db_session.query(StudentProfile).one().recommended_level == "university"


def test_topic_test_can_skip_roadmap_stage(client, db_session):
    _setup(client, db_session)
    a = _by_title(client, "Python Basics")
    attempt = client.post(f"/api/assessments/{a['id']}/start").json()
    key, _ = _key(db_session, a["id"])
    client.post(f"/api/assessments/attempts/{attempt['attempt_id']}/submit", json={"answers": key})
    st = {s["key"]: s for s in client.get("/api/learning/roadmap").json()["stages"]}
    assert st["python"]["status"] == "completed" and st["python"]["skipped_by_assessment"]


def test_lower_level_test_does_not_skip_stage(client, db_session):
    _setup(client, db_session)  # college student
    a = _by_title(client, "AI & Coding Basics")  # school-level ai_fundamentals test
    attempt = client.post(f"/api/assessments/{a['id']}/start").json()
    key, _ = _key(db_session, a["id"])
    client.post(f"/api/assessments/attempts/{attempt['attempt_id']}/submit", json={"answers": key})
    st = {s["key"]: s for s in client.get("/api/learning/roadmap").json()["stages"]}
    assert st["ai_fundamentals"]["status"] != "completed"


def test_dashboard_reports_latest_score(client, db_session):
    _setup(client, db_session)
    a = _by_title(client, "Python Basics")
    attempt = client.post(f"/api/assessments/{a['id']}/start").json()
    key, _ = _key(db_session, a["id"])
    client.post(f"/api/assessments/attempts/{attempt['attempt_id']}/submit", json={"answers": key})
    stats = client.get("/api/students/dashboard").json()["stats"]
    assert stats["assessments_taken"] >= 1 and stats["latest_score_percent"] == 100
