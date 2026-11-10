"""Study Planner: dated study tasks, lesson suggestions and a weekly summary."""

import uuid
from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Query, Response
from sqlalchemy import select

from app.core.deps import DbSession, StudentUser
from app.core.errors import ApiError
from app.models import Course, LearningProgress, Lesson, StudyTask
from app.models.enums import ProgressStatus, TaskStatus
from app.schemas.growth import PlannerSummary, TaskIn, TaskOut, TaskSuggestion, TaskUpdate
from app.services.opportunities import aware

router = APIRouter(prefix="/planner", tags=["study planner"])

DHAKA = timedelta(hours=6)
MAX_TASKS = 1000


def today() -> date:
    return (datetime.now(UTC) + DHAKA).date()  # Bangladesh calendar day


def task_out(db, t: StudyTask) -> TaskOut:
    lesson = db.get(Lesson, t.lesson_id) if t.lesson_id else None
    return TaskOut(id=str(t.id), title=t.title, due_on=t.due_on, planned_minutes=t.planned_minutes, status=t.status,
                   done_at=aware(t.done_at), lesson_id=str(t.lesson_id) if t.lesson_id else None,
                   lesson_title=lesson.title if lesson else None, notes=t.notes)


def _own(db, user, task_id: uuid.UUID) -> StudyTask:
    t = db.get(StudyTask, task_id)
    if not t or t.user_id != user.id:
        raise ApiError(404, "task_not_found", "Task not found.")
    return t


def _check_due(d: date) -> None:
    if d < today() - timedelta(days=60) or d > today() + timedelta(days=366):
        raise ApiError(422, "validation_error", "Pick a date within the next year.", details=[{"field": "due_on", "message": "Pick a date within the next year."}])


@router.get("/tasks", response_model=list[TaskOut])
def tasks(user: StudentUser, db: DbSession, start: date | None = Query(default=None, alias="from"),
          end: date | None = Query(default=None, alias="to")):
    start = start or today() - timedelta(days=today().weekday())
    end = end or start + timedelta(days=6)
    if end < start or (end - start).days > 62:
        raise ApiError(422, "bad_range", "Choose a range of up to two months.")
    rows = db.scalars(select(StudyTask).where(StudyTask.user_id == user.id, StudyTask.due_on >= start, StudyTask.due_on <= end)
                      .order_by(StudyTask.due_on, StudyTask.created_at)).all()
    return [task_out(db, t) for t in rows]


@router.post("/tasks", response_model=TaskOut, status_code=201)
def add_task(body: TaskIn, user: StudentUser, db: DbSession):
    _check_due(body.due_on)
    if db.query(StudyTask).filter(StudyTask.user_id == user.id).count() >= MAX_TASKS:
        raise ApiError(409, "too_many_tasks", "Your planner is full. Delete some old tasks first.")
    if body.lesson_id:
        lesson = db.get(Lesson, body.lesson_id)
        if not lesson or not lesson.course.is_published:
            raise ApiError(404, "lesson_not_found", "Lesson not found.")
    t = StudyTask(user_id=user.id, **body.model_dump(), status=TaskStatus.todo)
    db.add(t)
    db.commit()
    return task_out(db, t)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: uuid.UUID, body: TaskUpdate, user: StudentUser, db: DbSession):
    t = _own(db, user, task_id)
    # null means "no change" for everything except notes (which it clears).
    changes = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None or k == "notes"}
    if changes.get("due_on"):
        _check_due(changes["due_on"])
    if "status" in changes and changes["status"] != t.status:
        t.done_at = datetime.now(UTC) if changes["status"] == TaskStatus.done else None
    for k, v in changes.items():
        setattr(t, k, v)
    db.commit()
    return task_out(db, t)


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: uuid.UUID, user: StudentUser, db: DbSession):
    db.delete(_own(db, user, task_id))
    db.commit()
    return Response(status_code=204)


@router.get("/suggestions", response_model=list[TaskSuggestion])
def suggestions(user: StudentUser, db: DbSession):
    """The next unfinished lesson in each course the student has started, not already planned."""
    progress = db.execute(select(LearningProgress.course_id, LearningProgress.lesson_id, LearningProgress.status)
                          .where(LearningProgress.user_id == user.id)).all()
    done = {lid for _, lid, st in progress if st == ProgressStatus.completed}
    started_courses = list(dict.fromkeys(cid for cid, _, _ in progress))
    planned = {lid for lid, in db.execute(select(StudyTask.lesson_id).where(
        StudyTask.user_id == user.id, StudyTask.status == TaskStatus.todo, StudyTask.lesson_id.is_not(None))).all()}
    out: list[TaskSuggestion] = []
    courses = db.scalars(select(Course).where(Course.id.in_(started_courses), Course.is_published.is_(True))).all() if started_courses else []
    if not courses and user.student_profile and user.student_profile.education_level:
        courses = db.scalars(select(Course).where(Course.is_published.is_(True), Course.level == user.student_profile.education_level)
                             .order_by(Course.order_index).limit(2)).all()
    for course in courses:
        nxt = next((l for l in course.lessons if l.id not in done), None)
        if nxt and nxt.id not in planned:
            out.append(TaskSuggestion(lesson_id=str(nxt.id), title=nxt.title, course_title=course.title, duration_min=nxt.duration_min))
    return out[:5]


@router.get("/summary", response_model=PlannerSummary)
def summary(user: StudentUser, db: DbSession):
    start = today() - timedelta(days=today().weekday())
    week = db.scalars(select(StudyTask).where(StudyTask.user_id == user.id, StudyTask.due_on >= start,
                                              StudyTask.due_on <= start + timedelta(days=6))).all()
    finished_days = {(aware(d) + DHAKA).date() for d, in db.execute(select(StudyTask.done_at).where(
        StudyTask.user_id == user.id, StudyTask.done_at.is_not(None),
        StudyTask.done_at >= datetime.now(UTC) - timedelta(days=120))).all()}
    streak, day = 0, today()
    if day not in finished_days:
        day -= timedelta(days=1)  # today isn't over yet: a streak through yesterday still counts
    while day in finished_days:
        streak, day = streak + 1, day - timedelta(days=1)
    return PlannerSummary(
        week_start=start, planned_minutes=sum(t.planned_minutes for t in week),
        done_minutes=sum(t.planned_minutes for t in week if t.status == TaskStatus.done),
        tasks_done=sum(t.status == TaskStatus.done for t in week), tasks_total=len(week), streak_days=streak,
    )
