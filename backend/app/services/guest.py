"""Guest mode for the competition: one click signs a visitor in as a student, teacher or admin.

- Guest students are throwaway accounts, one per click, so visitors never see each other's tutor chats or notes.
  They are deleted GUEST_STUDENT_HOURS after creation (checked on each new guest sign-in).
- Guest teacher and admin are shared accounts and read-only (enforced in core/deps.py).
- Audience split: guest staff only see guest students, and real staff never see guests (`audience`).
  A few sample students with progress, a submitted project and a pending achievement give guest staff
  something to look at. Everything guest-related uses the reserved .invalid domain, so no mail is ever sent.
"""

import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import (
    Course, LearningProgress, Project, ProjectChallenge, Role, SkillRecord, StudentProfile, TeacherProfile, User,
)
from app.models.enums import EducationLevel, Language, ProgressStatus, ProjectStatus, SkillKind, VerificationStatus

DOMAIN = "guest.iccheghuri.invalid"
STUDENT_PREFIX = "guest-s-"
SAMPLE_PREFIX = "sample-"

STAFF = {
    Role.teacher: ("guest-teacher", "Guest Teacher"),
    Role.admin: ("guest-admin", "Guest Admin"),
}

# (slug, name, level, class/year, district, interests, lessons done in their first course, project?, achievement?)
SAMPLES = [
    ("ayesha", "Ayesha Rahman (sample)", EducationLevel.school, "Class 8", "Dhaka", ["Python", "Robotics"], 3, False, True),
    ("tanvir", "Tanvir Hasan (sample)", EducationLevel.college, "HSC 1st year", "Chattogram", ["Data Science", "Mathematics"], 4, True, False),
    ("nusrat", "Nusrat Jahan (sample)", EducationLevel.college, "HSC 2nd year", "Rajshahi", ["Machine Learning", "Research"], 2, False, True),
    ("arif", "Arif Hossain (sample)", EducationLevel.university, "3rd year, CSE", "Sylhet", ["Machine Learning", "Competitions"], 5, True, False),
]


def audience(viewer: User):
    """SQL condition on User: guests see only guests, real staff see only real users."""
    return User.is_guest.is_(bool(viewer.is_guest))


def _now() -> datetime:
    return datetime.now(UTC)


def ensure_staff(db: Session, role: Role) -> User:
    local, name = STAFF[role]
    email = f"{local}@{DOMAIN}"
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, full_name=name, role=role, is_guest=True, email_verified_at=_now())
        if role == Role.teacher:
            user.teacher_profile = TeacherProfile(institution="IccheGhuri guest mode", expertise=["AI", "Python"], is_verified=True)
        db.add(user)
        db.flush()
    ensure_samples(db)
    return user


def create_student(db: Session, level: EducationLevel) -> User:
    cleanup(db)
    user = User(email=f"{STUDENT_PREFIX}{secrets.token_hex(6)}@{DOMAIN}", full_name="Guest Student", role=Role.student,
                is_guest=True, email_verified_at=_now())
    user.student_profile = StudentProfile(
        education_level=level, recommended_level=level, institution="Guest", preferred_language=Language.en,
        interests=["Python", "Machine Learning"], onboarding_completed=True,
    )
    db.add(user)
    db.flush()
    return user


def cleanup(db: Session) -> int:
    """Delete throwaway guest students past their lifetime. Related rows go with them (ON DELETE CASCADE)."""
    cutoff = _now() - timedelta(hours=get_settings().guest_student_hours)
    ids = db.scalars(select(User.id).where(User.is_guest.is_(True), User.role == Role.student,
                                           User.email.like(f"{STUDENT_PREFIX}%"), User.created_at < cutoff)).all()
    if ids:
        db.execute(delete(User).where(User.id.in_(ids)))
    return len(ids)


def ensure_samples(db: Session) -> None:
    """Create the sample students once. Their progress uses whatever published courses exist at the time."""
    if db.scalar(select(func.count()).select_from(User).where(User.email.like(f"{SAMPLE_PREFIX}%@{DOMAIN}"))):
        return
    now = _now()
    for i, (slug, name, level, year, district, interests, done, has_project, has_record) in enumerate(SAMPLES):
        u = User(email=f"{SAMPLE_PREFIX}{slug}@{DOMAIN}", full_name=name, role=Role.student, is_guest=True,
                 email_verified_at=now, last_login_at=now - timedelta(days=i))
        u.student_profile = StudentProfile(
            education_level=level, recommended_level=level, institution="Sample school", class_or_year=year, district=district,
            interests=interests, onboarding_completed=True, preferred_language=Language.bn if i % 2 else Language.en,
        )
        db.add(u)
        db.flush()
        course = db.scalar(select(Course).where(Course.level == level, Course.is_published.is_(True))
                           .order_by(Course.order_index, Course.title))
        if course:
            for j, lesson in enumerate(course.lessons[:done]):
                db.add(LearningProgress(user_id=u.id, course_id=course.id, lesson_id=lesson.id, status=ProgressStatus.completed,
                                        percent=100, completed_at=now - timedelta(days=done - j)))
        if has_project:
            challenge = db.scalar(select(ProjectChallenge).where(ProjectChallenge.level == level, ProjectChallenge.is_published.is_(True))
                                  .order_by(ProjectChallenge.order_index))
            db.add(Project(
                user_id=u.id, title=challenge.title if challenge else "Exam score analysis", level=level,
                challenge_id=challenge.id if challenge else None, status=ProjectStatus.submitted, submitted_at=now - timedelta(hours=6 + i),
                description="Sample project for guest mode.",
                documentation="Loaded a small dataset, cleaned missing values, and compared two simple models. Sample data only.",
                repo_url="https://github.com/example/sample-project",
            ))
        if has_record:
            db.add(SkillRecord(user_id=u.id, kind=SkillKind.competition, title="School science fair (sample)",
                               description="Sample achievement waiting for review.", issued_by="Sample school",
                               achieved_on=now - timedelta(days=30), verification_status=VerificationStatus.unverified))
    db.flush()
