"""In-app notifications for every signed-in user (web bell + mobile app)."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Query, Response
from sqlalchemy import func, select, update

from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.models import Notification, Role
from app.schemas.phase5 import NotificationList, NotificationOut, UnreadCount
from app.services.notify import sync_deadline_reminders
from app.services.opportunities import aware

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _out(n: Notification) -> NotificationOut:
    return NotificationOut(id=str(n.id), title=n.title, body=n.body, kind=n.kind, link=n.link,
                           read_at=aware(n.read_at), created_at=aware(n.created_at))


def _unread(db, user_id: uuid.UUID) -> int:
    return db.scalar(select(func.count()).select_from(Notification).where(
        Notification.user_id == user_id, Notification.read_at.is_(None), Notification.dismissed_at.is_(None))) or 0


def _mine(db, user, notification_id: uuid.UUID) -> Notification:
    n = db.get(Notification, notification_id)
    if not n or n.user_id != user.id or n.dismissed_at is not None:
        raise ApiError(404, "notification_not_found", "Notification not found.")
    return n


def _sync(db, user) -> None:
    if user.role == Role.student and sync_deadline_reminders(db, user.id):
        db.commit()


@router.get("", response_model=NotificationList)
def list_notifications(user: CurrentUser, db: DbSession, unread_only: bool = Query(default=False),
                       limit: int = Query(default=50, ge=1, le=100)):
    _sync(db, user)
    q = select(Notification).where(Notification.user_id == user.id, Notification.dismissed_at.is_(None))
    if unread_only:
        q = q.where(Notification.read_at.is_(None))
    rows = db.scalars(q.order_by(Notification.created_at.desc(), Notification.id).limit(limit)).all()
    return NotificationList(items=[_out(n) for n in rows], unread=_unread(db, user.id))


@router.get("/unread-count", response_model=UnreadCount)
def unread_count(user: CurrentUser, db: DbSession):
    _sync(db, user)  # cheap: one indexed query when nothing is due
    return UnreadCount(unread=_unread(db, user.id))


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: uuid.UUID, user: CurrentUser, db: DbSession):
    n = _mine(db, user, notification_id)
    if n.read_at is None:
        n.read_at = datetime.now(UTC)
        db.commit()
    return _out(n)


@router.post("/read-all", response_model=UnreadCount)
def mark_all_read(user: CurrentUser, db: DbSession):
    db.execute(update(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None),
                                          Notification.dismissed_at.is_(None))
               .values(read_at=datetime.now(UTC)))
    db.commit()
    return UnreadCount(unread=0)


@router.delete("/{notification_id}", status_code=204, response_class=Response)
def delete_notification(notification_id: uuid.UUID, user: CurrentUser, db: DbSession):
    n = _mine(db, user, notification_id)
    now = datetime.now(UTC)
    n.dismissed_at, n.read_at = now, n.read_at or now  # soft delete: keeps dedupe keys so reminders don't return
    db.commit()
    return Response(status_code=204)
