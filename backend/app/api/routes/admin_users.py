"""Admin: platform dashboard, user management, audit log and announcements. Every change is audited."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Query, Request
from sqlalchemy import func, insert, select
from sqlalchemy.orm import selectinload

from app.core.deps import AdminUser, DbSession
from app.core.errors import ApiError
from app.core.rate_limit import client_ip
from app.models import AuditLog, Notification, Role, StudentProfile, TeacherProfile, User
from app.schemas.phase5 import (
    AdminDashboardOut,
    AnnouncementIn,
    AnnouncementOut,
    AuditOut,
    UserAdminOut,
    UserAdminUpdate,
    UserPage,
)
from app.services.opportunities import aware
from app.services.staff_dashboard import audit_out, build_admin_dashboard, escape_like

router = APIRouter(prefix="/admin", tags=["admin"])


def _audit(db, request: Request, actor: User, action: str, target_type: str, target_id, details: dict | None = None):
    db.add(AuditLog(actor_id=actor.id, action=action, target_type=target_type, target_id=str(target_id) if target_id else None,
                    details=details or {}, ip=client_ip(request)))


def _user_out(u: User) -> UserAdminOut:
    p, t = u.student_profile, u.teacher_profile
    return UserAdminOut(
        id=str(u.id), email=u.email, full_name=u.full_name, role=u.role, is_active=u.is_active,
        created_at=aware(u.created_at), last_login_at=aware(u.last_login_at),
        education_level=p.education_level if p else None, institution=(p.institution if p else (t.institution if t else None)),
        is_minor=bool(p and p.is_minor), teacher_verified=t.is_verified if t else None,
    )


@router.get("/dashboard", response_model=AdminDashboardOut)
def dashboard(admin: AdminUser, db: DbSession):
    return build_admin_dashboard(db)


@router.get("/users", response_model=UserPage)
def users(admin: AdminUser, db: DbSession, q: str | None = Query(default=None, max_length=100), role: Role | None = Query(default=None),
          active: bool | None = Query(default=None), limit: int = Query(default=50, ge=1, le=200), offset: int = Query(default=0, ge=0)):
    stmt = select(User)
    if q and q.strip():
        like = f"%{escape_like(q.strip())}%"
        stmt = stmt.where(User.full_name.ilike(like, escape="\\") | User.email.ilike(like, escape="\\"))
    if role:
        stmt = stmt.where(User.role == role)
    if active is not None:
        stmt = stmt.where(User.is_active.is_(active))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.options(selectinload(User.student_profile), selectinload(User.teacher_profile))
                      .order_by(User.created_at.desc(), User.id).limit(limit).offset(offset)).all()
    return UserPage(items=[_user_out(u) for u in rows], total=total)


@router.patch("/users/{user_id}", response_model=UserAdminOut)
def update_user(user_id: uuid.UUID, body: UserAdminUpdate, request: Request, admin: AdminUser, db: DbSession):
    u = db.get(User, user_id)
    if not u:
        raise ApiError(404, "user_not_found", "User not found.")
    changes = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if u.id == admin.id and ("role" in changes or changes.get("is_active") is False):
        raise ApiError(403, "forbidden", "You can't change your own role or deactivate yourself. Ask another admin.")
    details: dict = {}
    revoke = False
    if "role" in changes and changes["role"] != u.role:
        details["role"] = [u.role.value if hasattr(u.role, "value") else u.role, changes["role"].value]
        u.role = changes["role"]
        revoke = True  # new permissions apply from the next sign-in; old sessions end now
        if u.role == Role.teacher:
            if not u.teacher_profile:
                db.add(TeacherProfile(user_id=u.id))
                db.flush()
                db.refresh(u)
            elif "teacher_verified" not in changes:
                u.teacher_profile.is_verified = False  # a stale verification from an earlier teacher stint doesn't carry over
    if "is_active" in changes and changes["is_active"] != u.is_active:
        details["is_active"] = changes["is_active"]
        u.is_active = changes["is_active"]
        revoke = revoke or not u.is_active
    if "teacher_verified" in changes:
        if not u.teacher_profile:
            raise ApiError(422, "not_a_teacher", "Only teachers can be verified.")
        if u.teacher_profile.is_verified != changes["teacher_verified"]:
            details["teacher_verified"] = changes["teacher_verified"]
            u.teacher_profile.is_verified = changes["teacher_verified"]
    if revoke:
        u.token_version += 1
    if details:
        _audit(db, request, admin, "user.update", "user", u.id, details)
    db.commit()
    return _user_out(u)


@router.get("/audit", response_model=list[AuditOut])
def audit(admin: AdminUser, db: DbSession, action: str | None = Query(default=None, max_length=80),
          limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0)):
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action.like(f"{escape_like(action.strip())}%", escape="\\"))
    rows = db.scalars(stmt.order_by(AuditLog.created_at.desc(), AuditLog.id).limit(limit).offset(offset)).all()
    return audit_out(db, list(rows))


@router.post("/announcements", response_model=AnnouncementOut, status_code=201)
def announce(body: AnnouncementIn, request: Request, admin: AdminUser, db: DbSession):
    stmt = select(User.id).where(User.is_active.is_(True))
    if body.audience == "students":
        stmt = stmt.where(User.role == Role.student)
        if body.level:
            stmt = stmt.join(StudentProfile, StudentProfile.user_id == User.id).where(StudentProfile.education_level == body.level)
    elif body.audience == "teachers":
        stmt = stmt.where(User.role.in_([Role.teacher, Role.admin]))
    ids = db.scalars(stmt).all()
    if ids:
        now = datetime.now(UTC)
        db.execute(insert(Notification), [
            {"id": uuid.uuid4(), "user_id": uid, "title": body.title, "body": body.body, "kind": "announcement",
             "link": body.link, "created_at": now, "updated_at": now} for uid in ids])
    _audit(db, request, admin, "announcement.send", "notification", None,
           {"title": body.title, "audience": body.audience, "level": body.level, "sent": len(ids)})
    db.commit()
    return AnnouncementOut(sent=len(ids))
