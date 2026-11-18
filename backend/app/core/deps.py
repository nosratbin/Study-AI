import uuid
from collections.abc import Callable
from typing import Annotated

import jwt
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.core.security import decode_token, is_revoked
from app.db.session import get_db
from app.models import Role, User

ACCESS_COOKIE = "la_access"
REFRESH_COOKIE = "la_refresh"

DbSession = Annotated[Session, Depends(get_db)]


def _extract_access_token(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None
    return request.cookies.get(ACCESS_COOKIE)


def get_current_user(request: Request, db: DbSession) -> User:
    token = _extract_access_token(request)
    if not token:
        raise ApiError(401, "not_authenticated", "Sign in to continue.")
    try:
        payload = decode_token(token, "access")
        user_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError, KeyError):
        raise ApiError(401, "invalid_token", "Your session has expired. Please sign in again.")
    user = db.get(User, user_id)
    if not user or not user.is_active or payload.get("ver") != user.token_version or is_revoked(db, payload):
        raise ApiError(401, "invalid_token", "Your session has expired. Please sign in again.")
    request.state.user_id = str(user.id)
    if user.is_guest and request.method not in SAFE_METHODS and _guest_blocked(user, request.url.path):
        raise ApiError(403, "guest_read_only", "Guest accounts can look around but can't make changes. Create a free account to try this.")
    return user


SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
# Sign-out and token refresh stay open; "sign out everywhere" would log out every visitor sharing a guest account.
_GUEST_OPEN_PATHS = ("/api/auth/logout", "/api/auth/refresh")


def _guest_blocked(user: User, path: str) -> bool:
    """Guest teacher/admin are shared, so they are read-only. Guest students own a throwaway account and may use it fully."""
    if path.startswith("/api/auth/logout-all"):
        return user.role != Role.student
    if path.startswith(_GUEST_OPEN_PATHS):
        return False
    return user.role != Role.student


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: Role) -> Callable[[User], User]:
    """Backend-enforced RBAC. Admins are not implicitly granted other roles' routes."""

    def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise ApiError(403, "forbidden", "You don't have permission to do this.")
        return user

    return checker


StudentUser = Annotated[User, Depends(require_roles(Role.student))]
TeacherUser = Annotated[User, Depends(require_roles(Role.teacher, Role.admin))]
AdminUser = Annotated[User, Depends(require_roles(Role.admin))]


def is_verified_staff(user: User) -> bool:
    """Admins, or teachers an admin has verified."""
    return user.role == Role.admin or (user.role == Role.teacher and bool(user.teacher_profile and user.teacher_profile.is_verified))


def _verified_teacher(user: TeacherUser) -> User:
    """Student data and publishing need an admin-verified teacher (or an admin)."""
    if not is_verified_staff(user):
        raise ApiError(403, "teacher_not_verified", "An admin needs to verify your teacher account first.")
    return user


VerifiedTeacherUser = Annotated[User, Depends(_verified_teacher)]
