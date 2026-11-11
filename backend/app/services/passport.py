"""Skill Passport: everything a student has achieved, from system records plus self-reported achievements.

System-recorded items (completed courses, certificates, assessments, reviewed projects) are trustworthy by
construction. Self-reported achievements stay "unverified" until an admin reviews the evidence.
Never reads MindCare tables.
"""

import secrets
import uuid
from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    Assessment,
    AssessmentResult,
    Certificate,
    Course,
    LearningProgress,
    Lesson,
    Project,
    SkillRecord,
    User,
)
from app.models.enums import ProgressStatus, ProjectStatus, VerificationStatus
from app.schemas.growth import (
    AssessmentSummary,
    CompletedCourse,
    PassportOut,
    PassportProject,
    PublicPassportOut,
    ShareState,
    SkillRecordOut,
)
from app.services.notify import notify
from app.services.opportunities import aware


def new_certificate_code() -> str:
    return "LA-" + secrets.token_hex(5).upper()  # 40 bits: unguessable enough to look up, short enough to type


def issue_certificate_if_complete(db: Session, user_id: uuid.UUID, course: Course) -> Certificate | None:
    """Idempotent: one certificate per student per course, issued once every lesson is completed."""
    db.flush()  # count the progress row the caller just updated
    total = db.scalar(select(func.count(Lesson.id)).where(Lesson.course_id == course.id)) or 0
    done = db.scalar(select(func.count(LearningProgress.id)).where(
        LearningProgress.user_id == user_id, LearningProgress.course_id == course.id,
        LearningProgress.status == ProgressStatus.completed, LearningProgress.lesson_id.is_not(None))) or 0
    existing = db.scalar(select(Certificate).where(Certificate.user_id == user_id, Certificate.course_id == course.id))
    if existing or not total or done < total:
        return existing
    cert = Certificate(user_id=user_id, course_id=course.id, title=f"Completed: {course.title}",
                       certificate_code=new_certificate_code(), issued_at=datetime.now(UTC))
    try:
        with db.begin_nested():
            db.add(cert)
    except IntegrityError:  # a parallel request issued it first
        return db.scalar(select(Certificate).where(Certificate.user_id == user_id, Certificate.course_id == course.id))
    notify(db, user_id, f"Certificate earned: {course.title}", "It's on your Skill Passport. Share it with the verification code.",
           kind="certificate", link="/passport")
    return cert


def record_out(r: SkillRecord) -> SkillRecordOut:
    return SkillRecordOut(
        id=str(r.id), kind=r.kind, title=r.title, description=r.description, evidence_url=r.evidence_url,
        issued_by=r.issued_by, achieved_on=r.achieved_on.date() if isinstance(r.achieved_on, datetime) else r.achieved_on,
        verification_status=r.verification_status, verified_at=aware(r.verified_at), is_public=r.is_public,
    )


def _courses(db: Session, user_id: uuid.UUID) -> tuple[list[CompletedCourse], list[CompletedCourse]]:
    totals = dict(db.execute(select(Lesson.course_id, func.count(Lesson.id)).group_by(Lesson.course_id)).all())
    done: dict[uuid.UUID, int] = defaultdict(int)
    for cid, in db.execute(select(LearningProgress.course_id).where(
            LearningProgress.user_id == user_id, LearningProgress.status == ProgressStatus.completed,
            LearningProgress.lesson_id.is_not(None))).all():
        done[cid] += 1
    started = {cid for cid, in db.execute(select(LearningProgress.course_id).where(LearningProgress.user_id == user_id)).all()}
    certs = {c.course_id: c for c in db.scalars(select(Certificate).where(Certificate.user_id == user_id)).all()}
    complete, partial = [], []
    if not started:
        return complete, partial
    for course in db.scalars(select(Course).where(Course.id.in_(started)).order_by(Course.order_index)).all():
        total = totals.get(course.id, 0)
        cert = certs.get(course.id)
        item = CompletedCourse(course_id=str(course.id), title=course.title, level=course.level, category=course.category,
                               completed_lessons=done[course.id], total_lessons=total,
                               certificate_code=cert.certificate_code if cert else None,
                               issued_at=aware(cert.issued_at) if cert else None, is_demo=course.is_demo)
        (complete if total and done[course.id] >= total else partial).append(item)
    return complete, partial


def _projects(db: Session, user_id: uuid.UUID) -> list[PassportProject]:
    rows = db.scalars(select(Project).where(Project.user_id == user_id).order_by(Project.updated_at.desc())).all()
    return [PassportProject(id=str(p.id), title=p.title, description=p.description, status=p.status, repo_url=p.repo_url,
                            colab_url=p.colab_url, reviewed=p.status == ProjectStatus.reviewed, is_public=p.is_public)
            for p in rows]


def _skills(courses: list[CompletedCourse], projects: list[PassportProject], records: list[SkillRecordOut]) -> list[str]:
    """Skill tags evidenced by completed courses, reviewed projects and verified 'skill' records."""
    seen: dict[str, None] = {}
    for c in courses:
        if c.category:
            seen[c.category.replace("_", " ").title() if len(c.category) > 3 else c.category.upper()] = None
    if any(p.reviewed for p in projects):
        seen["Project work"] = None
    for r in records:
        if r.kind == "skill" and r.verification_status == VerificationStatus.verified:
            seen[r.title] = None
    return list(seen)[:20]


def build_passport(db: Session, user: User) -> PassportOut:
    profile = user.student_profile
    # Backfill: courses finished before certificates existed still get one.
    for course in db.scalars(select(Course).where(Course.id.in_(
            select(LearningProgress.course_id).where(LearningProgress.user_id == user.id)))).all():
        issue_certificate_if_complete(db, user.id, course)
    db.commit()

    complete, partial = _courses(db, user.id)
    results = db.execute(
        select(AssessmentResult, Assessment.title).join(Assessment, Assessment.id == AssessmentResult.assessment_id)
        .where(AssessmentResult.user_id == user.id).order_by(AssessmentResult.completed_at.desc()).limit(10)
    ).all()
    assessments = [AssessmentSummary(title=t, score=r.score, max_score=r.max_score, recommended_level=r.recommended_level,
                                     completed_at=aware(r.completed_at)) for r, t in results]
    projects = _projects(db, user.id)
    records = [record_out(r) for r in db.scalars(select(SkillRecord).where(SkillRecord.user_id == user.id)
                                                  .order_by(SkillRecord.achieved_on.desc().nullslast(), SkillRecord.created_at.desc())).all()]
    return PassportOut(
        full_name=user.full_name, education_level=profile.education_level if profile else None,
        institution=profile.institution if profile else None, is_minor=bool(profile and profile.is_minor),
        courses=complete, in_progress_courses=partial, assessments=assessments, projects=projects, records=records,
        skills=_skills(complete, projects, records),
        share=ShareState(enabled=bool(profile and profile.passport_token), token=profile.passport_token if profile else None,
                         shared_at=aware(profile.passport_shared_at) if profile else None),
    )


# Common Bangladeshi name prefixes: "Md. Karim Hasan" should show as "Karim H.", not "Md. H.".
HONORIFICS = {"md", "md.", "mohammad", "mohammed", "muhammad", "mohd", "mohd.", "mst", "mst.", "most", "most.", "mosammat", "mosammot", "sk", "sk.", "sheikh"}


def display_name(user: User) -> str:
    """Students under 18 appear as first name + last initial on public pages."""
    parts = user.full_name.split()
    if not (user.student_profile and user.student_profile.is_minor) or len(parts) < 2:
        return user.full_name
    given = [p for p in parts[:-1] if p.lower() not in HONORIFICS] or parts[:1]
    return f"{given[0]} {parts[-1][0]}."


def public_passport(db: Session, user: User) -> PublicPassportOut:
    """Only what the student chose to share: completed courses, plus projects and achievements marked public."""
    profile = user.student_profile
    complete, _ = _courses(db, user.id)
    projects = [p for p in _projects(db, user.id) if p.is_public and p.status != ProjectStatus.draft]
    records = [record_out(r) for r in db.scalars(select(SkillRecord).where(
        SkillRecord.user_id == user.id, SkillRecord.is_public.is_(True),
        SkillRecord.verification_status != VerificationStatus.rejected)).all()]
    return PublicPassportOut(
        display_name=display_name(user), education_level=profile.education_level if profile else None,
        institution=None if (profile and profile.is_minor) else (profile.institution if profile else None),
        courses=complete, projects=projects, records=records, skills=_skills(complete, projects, records),
    )
