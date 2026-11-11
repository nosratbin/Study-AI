"""Teacher and admin dashboards: aggregate academic activity only.

Like the student dashboard, this module never reads MindCare tables (check-ins, support requests). There is a test
that greps this source for them.
"""

from collections import defaultdict
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    AIConversation,
    AIMessage,
    Assessment,
    AssessmentResult,
    AuditLog,
    Career,
    Certificate,
    Course,
    LearningProgress,
    Lesson,
    Opportunity,
    Project,
    ProjectChallenge,
    Role,
    SkillRecord,
    StudentProfile,
    User,
)
from app.models.enums import ChatRole, EducationLevel, ProgressStatus, ProjectStatus, VerificationStatus
from app.schemas.phase5 import (
    AdminContent,
    AdminDashboardOut,
    AdminQueues,
    AdminStats,
    AssessmentStat,
    AuditOut,
    CourseStat,
    DayCount,
    LabelCount,
    StudentCourseProgress,
    StudentDetail,
    StudentProject,
    StudentResult,
    StudentRow,
    TeacherDashboardOut,
    TeacherStats,
    TopicStat,
)
from app.services.assessment import TOPIC_LABELS
from app.services.opportunities import aware

BD = timedelta(hours=6)  # Bangladesh time: days are bucketed by the local calendar


def _bd_day(dt: datetime) -> date:
    return (aware(dt) + BD).date()


def _series(timestamps: list[datetime], days: int) -> list[DayCount]:
    today = (datetime.now(UTC) + BD).date()
    counts: dict[date, int] = defaultdict(int)
    for ts in timestamps:
        if ts:
            counts[_bd_day(ts)] += 1
    return [DayCount(day=(d := today - timedelta(days=i)).isoformat(), count=counts.get(d, 0)) for i in range(days - 1, -1, -1)]


def _since(days: int) -> datetime:
    """Start of the Bangladesh calendar day `days - 1` days ago, in UTC."""
    today = (datetime.now(UTC) + BD).date()
    start = datetime.combine(today - timedelta(days=days - 1), datetime.min.time(), tzinfo=UTC)
    return start - BD


def escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _pct(correct: int, total: int) -> int:
    return round(100 * correct / total) if total else 0


def _count(db: Session, q) -> int:
    return db.scalar(q) or 0


# ---------- teacher ----------


def course_stats(db: Session, courses: list[Course]) -> list[CourseStat]:
    ids = [c.id for c in courses]
    if not ids:
        return []
    lesson_counts = dict(db.execute(select(Lesson.course_id, func.count(Lesson.id))
                                    .where(Lesson.course_id.in_(ids)).group_by(Lesson.course_id)).all())
    learners = dict(db.execute(select(LearningProgress.course_id, func.count(func.distinct(LearningProgress.user_id)))
                               .where(LearningProgress.course_id.in_(ids)).group_by(LearningProgress.course_id)).all())
    done_rows = db.execute(
        select(LearningProgress.course_id, LearningProgress.user_id, func.count(LearningProgress.id))
        .where(LearningProgress.course_id.in_(ids), LearningProgress.status == ProgressStatus.completed,
               LearningProgress.lesson_id.is_not(None))
        .group_by(LearningProgress.course_id, LearningProgress.user_id)
    ).all()
    completions: dict = defaultdict(int)
    percent_sum: dict = defaultdict(int)
    for course_id, _uid, n in done_rows:
        total = lesson_counts.get(course_id, 0)
        if total:
            percent_sum[course_id] += min(100, round(100 * n / total))
            if n >= total:
                completions[course_id] += 1
    out = []
    for c in courses:
        n_learners = learners.get(c.id, 0)
        out.append(CourseStat(
            id=str(c.id), title=c.title, slug=c.slug, level=c.level, is_published=c.is_published, is_demo=c.is_demo,
            lesson_count=lesson_counts.get(c.id, 0), learners=n_learners, completions=completions.get(c.id, 0),
            avg_percent=round(percent_sum.get(c.id, 0) / n_learners) if n_learners else 0,
        ))
    return out


def build_teacher_dashboard(db: Session, teacher: User) -> TeacherDashboardOut:
    since7 = _since(7)
    students = _count(db, select(func.count()).select_from(User).where(User.role == Role.student, User.is_active.is_(True)))
    active = _count(db, select(func.count(func.distinct(LearningProgress.user_id))).where(LearningProgress.updated_at >= since7))
    completed_ts = db.scalars(select(LearningProgress.completed_at).where(
        LearningProgress.status == ProgressStatus.completed, LearningProgress.completed_at >= _since(14))).all()
    lessons_7d = sum(1 for ts in completed_ts if ts and aware(ts) >= since7)
    queue = _count(db, select(func.count()).select_from(Project).where(Project.status == ProjectStatus.submitted))
    mine = _count(db, select(func.count()).select_from(Project).where(Project.reviewed_by == teacher.id))

    courses = db.scalars(select(Course).order_by(Course.level, Course.order_index, Course.title)).all()

    results = db.execute(
        select(AssessmentResult.assessment_id, AssessmentResult.score, AssessmentResult.max_score, AssessmentResult.topic_breakdown)
        .where(AssessmentResult.completed_at.is_not(None), AssessmentResult.completed_at >= _since(180))
    ).all()
    per_assessment: dict = defaultdict(lambda: [0, 0])  # attempts, percent sum
    topics: dict[str, list[int]] = defaultdict(lambda: [0, 0])  # correct, total
    for aid, score, max_score, breakdown in results:
        per_assessment[aid][0] += 1
        per_assessment[aid][1] += _pct(score, max_score)
        for topic, v in ((breakdown or {}).get("topics") or {}).items():
            if isinstance(v, dict):
                topics[topic][0] += int(v.get("correct", 0))
                topics[topic][1] += int(v.get("total", 0))
    titles = dict(db.execute(select(Assessment.id, Assessment.title).where(Assessment.id.in_(list(per_assessment)))).all()) if per_assessment else {}
    assessments = sorted(
        (AssessmentStat(id=str(aid), title=titles.get(aid, "Assessment"), attempts=a, avg_percent=round(s / a))
         for aid, (a, s) in per_assessment.items() if a),
        key=lambda x: -x.attempts,
    )
    weak = sorted(
        (TopicStat(topic=t, label=TOPIC_LABELS.get(t, t.replace("_", " ").title()), avg_percent=_pct(c, n), questions=n)
         for t, (c, n) in topics.items() if n >= 3),
        key=lambda x: x.avg_percent,
    )[:6]

    return TeacherDashboardOut(
        stats=TeacherStats(students=students, active_7d=active, lessons_completed_7d=lessons_7d, review_queue=queue, my_reviews=mine,
                           verified=teacher.role == Role.admin or bool(teacher.teacher_profile and teacher.teacher_profile.is_verified)),
        activity=_series(list(completed_ts), 14),
        courses=course_stats(db, list(courses)),
        assessments=assessments[:10],
        weak_topics=weak,
    )


def _student_rows(db: Session, users: list[User]) -> list[StudentRow]:
    ids = [u.id for u in users]
    if not ids:
        return []
    lessons = dict(db.execute(select(LearningProgress.user_id, func.count(LearningProgress.id)).where(
        LearningProgress.user_id.in_(ids), LearningProgress.status == ProgressStatus.completed,
        LearningProgress.lesson_id.is_not(None)).group_by(LearningProgress.user_id)).all())
    last = dict(db.execute(select(LearningProgress.user_id, func.max(LearningProgress.updated_at))
                           .where(LearningProgress.user_id.in_(ids)).group_by(LearningProgress.user_id)).all())
    submitted = dict(db.execute(select(Project.user_id, func.count(Project.id)).where(
        Project.user_id.in_(ids), Project.status != ProjectStatus.draft).group_by(Project.user_id)).all())
    done_courses = dict(db.execute(select(Certificate.user_id, func.count(Certificate.id))
                                   .where(Certificate.user_id.in_(ids)).group_by(Certificate.user_id)).all())
    scores: dict = defaultdict(list)
    for uid, s, m in db.execute(select(AssessmentResult.user_id, AssessmentResult.score, AssessmentResult.max_score).where(
            AssessmentResult.user_id.in_(ids), AssessmentResult.completed_at.is_not(None))).all():
        scores[uid].append(_pct(s, m))
    rows = []
    for u in users:
        p = u.student_profile
        sc = scores.get(u.id)
        last_active = max((t for t in (aware(last.get(u.id)) if last.get(u.id) else None, aware(u.last_login_at) if u.last_login_at else None) if t),
                          default=None)
        rows.append(StudentRow(
            id=str(u.id), full_name=u.full_name, education_level=p.education_level if p else None,
            institution=p.institution if p else None, is_minor=bool(p and p.is_minor),
            lessons_completed=lessons.get(u.id, 0), courses_completed=done_courses.get(u.id, 0),
            avg_assessment=round(sum(sc) / len(sc)) if sc else None, projects_submitted=submitted.get(u.id, 0),
            last_active=last_active,
        ))
    return rows


def list_students(db: Session, q: str | None, level: EducationLevel | None, limit: int, offset: int) -> tuple[list[StudentRow], int]:
    stmt = select(User).outerjoin(StudentProfile, StudentProfile.user_id == User.id).where(User.role == Role.student, User.is_active.is_(True))
    if q and q.strip():
        like = f"%{escape_like(q.strip())}%"
        stmt = stmt.where(User.full_name.ilike(like, escape="\\") | func.coalesce(StudentProfile.institution, "").ilike(like, escape="\\"))
    if level:
        stmt = stmt.where(StudentProfile.education_level == level)
    total = _count(db, select(func.count()).select_from(stmt.subquery()))
    users = db.scalars(stmt.options(selectinload(User.student_profile)).order_by(User.full_name, User.id).limit(limit).offset(offset)).all()
    return _student_rows(db, list(users)), total


def student_detail(db: Session, u: User) -> StudentDetail:
    row = _student_rows(db, [u])[0]
    lesson_counts = dict(db.execute(select(Lesson.course_id, func.count(Lesson.id)).group_by(Lesson.course_id)).all())
    progress = db.execute(
        select(LearningProgress.course_id, func.count(LearningProgress.id))
        .where(LearningProgress.user_id == u.id, LearningProgress.status == ProgressStatus.completed, LearningProgress.lesson_id.is_not(None))
        .group_by(LearningProgress.course_id)
    ).all()
    started = set(db.scalars(select(LearningProgress.course_id).where(LearningProgress.user_id == u.id)).all())
    done = dict(progress)
    courses = db.scalars(select(Course).where(Course.id.in_(started))).all() if started else []
    course_rows = sorted(
        (StudentCourseProgress(course_id=str(c.id), title=c.title, completed_lessons=done.get(c.id, 0),
                               lesson_count=lesson_counts.get(c.id, 0),
                               percent=_pct(done.get(c.id, 0), lesson_counts.get(c.id, 0)))
         for c in courses),
        key=lambda x: -x.percent,
    )
    res = db.execute(
        select(Assessment.title, AssessmentResult.score, AssessmentResult.max_score, AssessmentResult.completed_at)
        .join(Assessment, Assessment.id == AssessmentResult.assessment_id)
        .where(AssessmentResult.user_id == u.id, AssessmentResult.completed_at.is_not(None))
        .order_by(AssessmentResult.completed_at.desc()).limit(20)
    ).all()
    projects = db.scalars(select(Project).where(Project.user_id == u.id, Project.status != ProjectStatus.draft)
                          .order_by(Project.updated_at.desc())).all()
    p = u.student_profile
    return StudentDetail(
        student=row,
        interests=list(p.interests or []) if p else [],
        courses=course_rows,
        results=[StudentResult(assessment_title=t, percent=_pct(s, m), completed_at=aware(at)) for t, s, m, at in res],
        projects=[StudentProject(id=str(x.id), title=x.title, status=x.status, score=x.score) for x in projects],
    )


# ---------- admin ----------


def audit_out(db: Session, rows: list[AuditLog]) -> list[AuditOut]:
    actor_ids = {r.actor_id for r in rows if r.actor_id}
    names = dict(db.execute(select(User.id, User.full_name).where(User.id.in_(actor_ids))).all()) if actor_ids else {}
    return [AuditOut(id=str(r.id), actor_name=names.get(r.actor_id), action=r.action, target_type=r.target_type,
                     target_id=r.target_id, details=r.details or {}, ip=r.ip, created_at=aware(r.created_at)) for r in rows]


def build_admin_dashboard(db: Session) -> AdminDashboardOut:
    roles = dict(db.execute(select(User.role, func.count(User.id)).where(User.is_active.is_(True)).group_by(User.role)).all())
    since7, since14, since30 = _since(7), _since(14), _since(30)
    stats = AdminStats(
        students=roles.get(Role.student, 0), teachers=roles.get(Role.teacher, 0), admins=roles.get(Role.admin, 0),
        active_7d=_count(db, select(func.count()).select_from(User).where(User.last_login_at >= since7)),
        new_30d=_count(db, select(func.count()).select_from(User).where(User.created_at >= since30)),
        deactivated=_count(db, select(func.count()).select_from(User).where(User.is_active.is_(False))),
    )
    by_level = dict(db.execute(
        select(StudentProfile.education_level, func.count(StudentProfile.id))
        .join(User, User.id == StudentProfile.user_id)
        .where(User.role == Role.student, User.is_active.is_(True)).group_by(StudentProfile.education_level)
    ).all())
    levels = [LabelCount(label=lvl.value, count=by_level.get(lvl, 0)) for lvl in EducationLevel]
    if by_level.get(None):
        levels.append(LabelCount(label="not_set", count=by_level[None]))

    signups = db.scalars(select(User.created_at).where(User.created_at >= since30, User.role == Role.student)).all()
    lessons = db.scalars(select(LearningProgress.completed_at).where(
        LearningProgress.status == ProgressStatus.completed, LearningProgress.completed_at >= since14)).all()
    ai = db.scalars(select(AIMessage.created_at).join(AIConversation, AIConversation.id == AIMessage.conversation_id)
                    .where(AIMessage.role == ChatRole.user, AIMessage.created_at >= since14)).all()

    content = AdminContent(
        courses_published=_count(db, select(func.count()).select_from(Course).where(Course.is_published.is_(True))),
        lessons=_count(db, select(func.count()).select_from(Lesson)),
        assessments=_count(db, select(func.count()).select_from(Assessment).where(Assessment.is_published.is_(True))),
        challenges=_count(db, select(func.count()).select_from(ProjectChallenge)),
        careers=_count(db, select(func.count()).select_from(Career).where(Career.is_published.is_(True))),
        opportunities_verified=_count(db, select(func.count()).select_from(Opportunity).where(
            Opportunity.verification_status == VerificationStatus.verified)),
    )
    queues = AdminQueues(
        opportunities_pending=_count(db, select(func.count()).select_from(Opportunity).where(
            Opportunity.verification_status == VerificationStatus.unverified)),
        achievements_pending=_count(db, select(func.count()).select_from(SkillRecord).where(
            SkillRecord.verification_status == VerificationStatus.unverified)),
        projects_submitted=_count(db, select(func.count()).select_from(Project).where(Project.status == ProjectStatus.submitted)),
    )
    recent = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(8)).all()
    return AdminDashboardOut(
        stats=stats, students_by_level=levels, signups=_series(list(signups), 30),
        lessons_completed=_series(list(lessons), 14), ai_messages=_series(list(ai), 14),
        content=content, queues=queues, recent_audit=audit_out(db, list(recent)),
    )
