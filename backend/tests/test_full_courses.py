import pytest

from app.models import Course
from app.seed_full_courses import FULL_COURSES, load_lessons, parse_course_file, seed_full_courses
from tests.conftest import ONBOARDING, register


def test_parser_splits_modules_and_lessons():
    text = "@module M1\n@lesson First | 12\n# First\n\n```bash\n@lesson not a marker | 1\n```\n@lesson Second | 20\n# Second\n"
    lessons = parse_course_file(text)
    assert [(l.title, l.minutes, l.module) for l in lessons] == [("First", 12, "M1"), ("Second", 20, "M1")]
    assert "@lesson not a marker" in lessons[0].content_md


@pytest.mark.parametrize("bad", ["stray text\n@lesson A | 5\n", "@lesson A | 5\n```\nopen fence\n", "@lesson no minutes\n"])
def test_parser_rejects_malformed_files(bad):
    with pytest.raises(ValueError):
        parse_course_file(bad)


@pytest.mark.parametrize("course", FULL_COURSES, ids=lambda c: c["slug"])
def test_course_files_are_complete(course):
    lessons = load_lessons(course["slug"])
    assert len(lessons) >= 12 and len({l.module for l in lessons}) >= 5
    assert all(l.module and l.content_md.startswith("# ") and len(l.content_md) > 1000 for l in lessons)


def test_full_courses_seed_as_real_content(client, db_session):
    assert seed_full_courses(db_session) == 3
    assert seed_full_courses(db_session) == 0  # idempotent
    assert db_session.query(Course).filter_by(is_demo=True).count() == 0

    register(client)
    client.post("/api/students/onboarding", json={**ONBOARDING, "education_level": "university"})
    c = client.get("/api/courses/git-github-university").json()
    assert not c["is_demo"] and c["category"] == "developer_tools"
    assert c["lessons"][0]["module"].startswith("Module 1") and c["lessons"][-1]["module"].startswith("Module 6")
    lesson = client.get(f"/api/lessons/{c['lessons'][0]['id']}").json()
    assert lesson["module"] == c["lessons"][0]["module"] and lesson["lesson_count"] == len(c["lessons"])
