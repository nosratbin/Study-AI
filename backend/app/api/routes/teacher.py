"""Teacher (and admin) tools: dashboard, student progress and course authoring.

Teachers see academic data only: never MindCare, planner tasks, or student emails. Teachers edit the courses they
created; admins edit any course, including seeded demo courses. Every authoring change is audited.
"""

import logging
import re
import secrets
import threading
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Query, Request, Response
from sqlalchemy import func, insert, select

from app.core.config import get_settings
from app.core.deps import DbSession, TeacherUser, VerifiedTeacherUser, is_verified_staff
from app.core.errors import ApiError
from app.core.rate_limit import client_ip
from app.models import AuditLog, Course, LearningProgress, Lesson, Notification, Role, StudentProfile, User
from app.models.enums import EducationLevel
from app.schemas.phase5 import (
    CourseIn,
    CourseUpdate,
    LessonIn,
    LessonOrderIn,
    LessonUpdate,
    StaffCourse,
    StaffCourseDetail,
    StaffLesson,
    StudentDetail,
    StudentRow,
    TeacherDashboardOut,
)
from app.services.notify import clamp
from app.services.opportunities import aware
from app.services.staff_dashboard import build_teacher_dashboard, list_students, student_detail

router = APIRouter(prefix="/teacher", tags=["teacher"])
log = logging.getLogger(__name__)


def _audit(db, request: Request, actor: User, action: str, target_type: str, target_id, details: dict | None = None):
    db.add(AuditLog(actor_id=actor.id, action=action, target_type=target_type, target_id=str(target_id),
                    details=details or {}, ip=client_ip(request)))


# ---------- dashboard & students ----------


@router.get("/dashboard", response_model=TeacherDashboardOut)
def dashboard(staff: TeacherUser, db: DbSession):
    return build_teacher_dashboard(db, staff)


@router.get("/students", response_model=list[StudentRow])
def students(staff: VerifiedTeacherUser, db: DbSession, response: Response,
             q: str | None = Query(default=None, max_length=100), level: EducationLevel | None = Query(default=None),
             limit: int = Query(default=50, ge=1, le=200), offset: int = Query(default=0, ge=0)):
    rows, total = list_students(db, q, level, limit, offset)
    response.headers["X-Total-Count"] = str(total)
    return rows


@router.get("/students/{student_id}", response_model=StudentDetail)
def student(student_id: uuid.UUID, staff: VerifiedTeacherUser, db: DbSession):
    u = db.get(User, student_id)
    if not u or u.role != Role.student or not u.is_active:
        raise ApiError(404, "student_not_found", "Student not found.")
    return student_detail(db, u)


# ---------- course authoring ----------


def _can_edit(user: User, c: Course) -> bool:
    # Unverified teachers get read-only course views; every mutating route also requires VerifiedTeacherUser.
    return user.role == Role.admin or (is_verified_staff(user) and c.created_by == user.id and not c.is_demo)


def _course_out(db, user: User, c: Course, detail: bool = False, *, authors: dict | None = None,
                counts: dict | None = None) -> StaffCourse | StaffCourseDetail:
    if authors is None:
        authors = {c.created_by: db.scalar(select(User.full_name).where(User.id == c.created_by))} if c.created_by else {}
    lesson_count = counts.get(c.id, 0) if counts is not None else len(c.lessons)
    base = dict(id=str(c.id), title=c.title, slug=c.slug, description=c.description, level=c.level, category=c.category,
                estimated_hours=c.estimated_hours, is_published=c.is_published, is_demo=c.is_demo,
                created_by_name=authors.get(c.created_by), can_edit=_can_edit(user, c),
                lesson_count=lesson_count, updated_at=aware(c.updated_at))
    if not detail:
        return StaffCourse(**base)
    lessons = [StaffLesson(id=str(lesson.id), title=lesson.title, order_index=lesson.order_index, duration_min=lesson.duration_min,
                           colab_url=lesson.colab_url, content_md=lesson.content_md) for lesson in c.lessons]
    return StaffCourseDetail(**base, lessons=lessons)


def _course(db, course_id: uuid.UUID) -> Course:
    c = db.get(Course, course_id)
    if not c:
        raise ApiError(404, "course_not_found", "Course not found.")
    return c


def _editable(db, user: User, course_id: uuid.UUID) -> Course:
    c = _course(db, course_id)
    if not _can_edit(user, c):
        raise ApiError(403, "forbidden", "Only the course's author or an admin can change it.")
    return c


def _slug(db, title: str, level: EducationLevel) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80] or "course"
    slug = f"{base}-{level.value}"
    while db.scalar(select(Course.id).where(Course.slug == slug)):
        slug = f"{base}-{level.value}-{secrets.token_hex(2)}"
    return slug


_reindex_lock = threading.Lock()
_reindex_pending = threading.Event()


def _reindex() -> None:
    """Refresh the AI Tutor's knowledge base after published content changes (best effort, after the response).

    Runs are serialized: a request that arrives during a run sets `pending`, and the running worker loops once more,
    so concurrent edits never embed the same lesson twice.
    """
    from app.db.session import SessionLocal
    from app.services.llm import get_llm
    from app.services.rag import ingest_lessons

    if not get_settings().ai_enabled:
        return
    _reindex_pending.set()
    # Re-check after releasing: a request that set `pending` while we held the lock (and so returned early)
    # must not be lost between our last `is_set()` check and `release()`.
    while _reindex_pending.is_set() and _reindex_lock.acquire(blocking=False):
        try:
            while _reindex_pending.is_set():
                _reindex_pending.clear()
                db = SessionLocal()
                try:
                    ingest_lessons(db, get_llm())
                except Exception:  # noqa: BLE001 — never let a background refresh crash the worker
                    log.exception("knowledge base refresh failed")
                finally:
                    db.close()
        finally:
            _reindex_lock.release()


def _announce_course(db, c: Course) -> None:
    ids = db.scalars(select(User.id).join(StudentProfile, StudentProfile.user_id == User.id).where(
        User.role == Role.student, User.is_active.is_(True), StudentProfile.education_level == c.level)).all()
    if ids:
        now = datetime.now(UTC)
        db.execute(insert(Notification), [
            {"id": uuid.uuid4(), "user_id": uid, **clamp(f"New course: {c.title}", c.description[:300]),
             "link": f"/learn/{c.slug}", "created_at": now, "updated_at": now} for uid in ids])


@router.get("/courses", response_model=list[StaffCourse])
def courses(staff: TeacherUser, db: DbSession, mine: bool = Query(default=False)):
    q = select(Course).order_by(Course.level, Course.order_index, Course.title)
    if mine:
        q = q.where(Course.created_by == staff.id)
    rows = db.scalars(q).all()
    author_ids = {c.created_by for c in rows if c.created_by}
    authors = dict(db.execute(select(User.id, User.full_name).where(User.id.in_(author_ids))).all()) if author_ids else {}
    counts = dict(db.execute(select(Lesson.course_id, func.count(Lesson.id)).group_by(Lesson.course_id)).all())
    return [_course_out(db, staff, c, authors=authors, counts=counts) for c in rows]


@router.post("/courses", response_model=StaffCourseDetail, status_code=201)
def create_course(body: CourseIn, request: Request, staff: VerifiedTeacherUser, db: DbSession):
    order = (db.scalar(select(func.max(Course.order_index))) or 0) + 1
    c = Course(**body.model_dump(), slug=_slug(db, body.title, body.level), created_by=staff.id, is_published=False,
               is_demo=False, order_index=order)
    db.add(c)
    db.flush()
    _audit(db, request, staff, "course.create", "course", c.id, {"title": c.title})
    db.commit()
    return _course_out(db, staff, c, detail=True)


@router.get("/courses/{course_id}", response_model=StaffCourseDetail)
def get_course(course_id: uuid.UUID, staff: TeacherUser, db: DbSession):
    return _course_out(db, staff, _course(db, course_id), detail=True)


@router.patch("/courses/{course_id}", response_model=StaffCourseDetail)
def update_course(course_id: uuid.UUID, body: CourseUpdate, request: Request, staff: VerifiedTeacherUser, db: DbSession,
                  background: BackgroundTasks):
    c = _editable(db, staff, course_id)
    changes = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    was_published = c.is_published
    if changes.get("is_published") and not was_published:
        if not c.lessons:
            raise ApiError(422, "course_empty", "Add at least one lesson before publishing.")
    for k, v in changes.items():
        setattr(c, k, v)
    if changes:
        _audit(db, request, staff, "course.update", "course", c.id, {"fields": sorted(changes)})
    if c.is_published and not was_published:
        first = not db.scalar(select(AuditLog.id).where(AuditLog.action == "course.publish", AuditLog.target_id == str(c.id)).limit(1))
        _audit(db, request, staff, "course.publish", "course", c.id)
        if first:  # republishing after a fix doesn't notify everyone again
            _announce_course(db, c)
    db.commit()
    if c.is_published or was_published:
        background.add_task(_reindex)
    return _course_out(db, staff, c, detail=True)


@router.delete("/courses/{course_id}", status_code=204, response_class=Response)
def delete_course(course_id: uuid.UUID, request: Request, staff: VerifiedTeacherUser, db: DbSession, background: BackgroundTasks):
    c = _editable(db, staff, course_id)
    if db.scalar(select(func.count(LearningProgress.id)).where(LearningProgress.course_id == c.id)):
        raise ApiError(409, "course_in_use", "Students have started this course. Unpublish it instead of deleting it.")
    was_published = c.is_published
    _audit(db, request, staff, "course.delete", "course", c.id, {"title": c.title})
    db.delete(c)
    db.commit()
    if was_published:
        background.add_task(_reindex)
    return Response(status_code=204)


@router.post("/courses/{course_id}/lessons", response_model=StaffCourseDetail, status_code=201)
def add_lesson(course_id: uuid.UUID, body: LessonIn, request: Request, staff: VerifiedTeacherUser, db: DbSession,
               background: BackgroundTasks):
    c = _editable(db, staff, course_id)
    order = max((lesson.order_index for lesson in c.lessons), default=-1) + 1
    lesson = Lesson(course_id=c.id, order_index=order, **body.model_dump())
    db.add(lesson)
    db.flush()
    _audit(db, request, staff, "lesson.create", "lesson", lesson.id, {"course_id": str(c.id), "title": lesson.title})
    db.commit()
    db.refresh(c)
    if c.is_published:
        background.add_task(_reindex)
    return _course_out(db, staff, c, detail=True)


def _editable_lesson(db, staff: User, lesson_id: uuid.UUID) -> tuple[Lesson, Course]:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise ApiError(404, "lesson_not_found", "Lesson not found.")
    return lesson, _editable(db, staff, lesson.course_id)


@router.patch("/lessons/{lesson_id}", response_model=StaffCourseDetail)
def update_lesson(lesson_id: uuid.UUID, body: LessonUpdate, request: Request, staff: VerifiedTeacherUser, db: DbSession,
                  background: BackgroundTasks):
    lesson, c = _editable_lesson(db, staff, lesson_id)
    data = body.model_dump(exclude_unset=True)
    changes = {k: v for k, v in data.items() if v is not None or k == "colab_url"}
    for k, v in changes.items():
        setattr(lesson, k, v)
    if changes:
        _audit(db, request, staff, "lesson.update", "lesson", lesson.id, {"fields": sorted(changes)})
    db.commit()
    db.refresh(c)
    if c.is_published and {"title", "content_md"} & set(changes):
        background.add_task(_reindex)
    return _course_out(db, staff, c, detail=True)


@router.delete("/lessons/{lesson_id}", response_model=StaffCourseDetail)
def delete_lesson(lesson_id: uuid.UUID, request: Request, staff: VerifiedTeacherUser, db: DbSession, background: BackgroundTasks):
    lesson, c = _editable_lesson(db, staff, lesson_id)
    if db.scalar(select(func.count(LearningProgress.id)).where(LearningProgress.lesson_id == lesson.id)):
        raise ApiError(409, "lesson_in_use", "Students have progress on this lesson, so it can't be deleted. Edit it instead.")
    if c.is_published and len(c.lessons) == 1:
        raise ApiError(409, "last_lesson", "A published course needs at least one lesson. Unpublish the course first.")
    _audit(db, request, staff, "lesson.delete", "lesson", lesson.id, {"course_id": str(c.id), "title": lesson.title})
    db.delete(lesson)
    db.commit()
    db.refresh(c)
    if c.is_published:
        background.add_task(_reindex)
    return _course_out(db, staff, c, detail=True)


@router.put("/courses/{course_id}/lesson-order", response_model=StaffCourseDetail)
def reorder(course_id: uuid.UUID, body: LessonOrderIn, request: Request, staff: VerifiedTeacherUser, db: DbSession):
    c = _editable(db, staff, course_id)
    current = {str(lesson.id): lesson for lesson in c.lessons}
    if sorted(body.lesson_ids) != sorted(current) or len(set(body.lesson_ids)) != len(body.lesson_ids):
        raise ApiError(422, "bad_order", "Send every lesson id of this course exactly once.")
    for i, lid in enumerate(body.lesson_ids):
        current[lid].order_index = i
    _audit(db, request, staff, "course.reorder", "course", c.id)
    db.commit()
    db.refresh(c)
    return _course_out(db, staff, c, detail=True)
