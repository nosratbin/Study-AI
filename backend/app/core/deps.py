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
    return user


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
