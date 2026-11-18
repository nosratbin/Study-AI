import uuid
from datetime import UTC, datetime

import jwt
from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.config import get_settings
from app.core.deps import ACCESS_COOKIE, REFRESH_COOKIE, CurrentUser, DbSession, _extract_access_token
from app.core.errors import ApiError
from app.core.rate_limit import rate_limit
from app.core.security import create_token, decode_token, hash_password, is_revoked, revoke, verify_password
from app.models import Role, StudentProfile, User
from app.schemas.auth import (
    AuthOut, GoogleIn, GuestIn, LoginIn, RefreshIn, RegisterIn, ResendIn, UserOut, VerificationOut, VerifyCodeIn, VerifyLinkIn, reject_alias,
)
from app.services import email as mailer
from app.services import guest as guest_mode
from app.services import verification
from app.services.firebase import verify_firebase_id_token

router = APIRouter(prefix="/auth", tags=["auth"])
auth_limit = Depends(rate_limit("auth", get_settings().rate_limit_auth_per_minute))
# Refresh is called automatically by clients, so it gets its own, larger bucket.
refresh_limit = Depends(rate_limit("refresh", 60))

# Constant-time-ish defence: compare against a real hash when the user doesn't exist.
_DUMMY_HASH = hash_password("not-a-real-password-1")


def user_out(user: User) -> UserOut:
    out = UserOut.model_validate(user)
    out.onboarding_completed = bool(user.student_profile and user.student_profile.onboarding_completed) or user.role != Role.student
    return out


def _is_native(request: Request) -> bool:
    return request.headers.get("X-Client-Type", "").lower() == "mobile"


def issue_session(request: Request, response: Response, user: User, native: bool | None = None, sid: str | None = None) -> AuthOut:
    """New sign-in when sid is None; a refresh passes the existing session id through."""
    s = get_settings()
    sid = sid or uuid.uuid4().hex
    access = create_token(user.id, user.role, user.token_version, "access", sid)
    refresh = create_token(user.id, user.role, user.token_version, "refresh", sid)
    if _is_native(request) if native is None else native:
        return AuthOut(user=user_out(user), access_token=access, refresh_token=refresh)
    common = {"httponly": True, "secure": s.cookie_secure, "samesite": "lax"}
    response.set_cookie(ACCESS_COOKIE, access, max_age=s.access_token_minutes * 60, path="/", **common)
    # Refresh cookie is only sent to the refresh endpoint.
    response.set_cookie(REFRESH_COOKIE, refresh, max_age=s.refresh_token_days * 86400, path="/api/auth", **common)
    return AuthOut(user=user_out(user))


def _send_check(db, user: User, tasks: BackgroundTasks) -> VerificationOut:
    """Start a new email check (unless one was sent moments ago) and say when the next one may be asked for."""
    wait = verification.resend_wait(db, user)
    if wait == 0:
        tasks.add_task(mailer.send, verification.start(db, user))
        wait = get_settings().email_resend_seconds
    db.commit()
    return VerificationOut(email=user.email, resend_after=wait)


def _require_email_service() -> None:
    s = get_settings()
    if not s.email_enabled and s.environment == "production":
        raise ApiError(503, "email_not_configured", "Email sign-up is unavailable right now. Use Continue with Google instead.")


@router.post("/register", response_model=VerificationOut, status_code=201, dependencies=[auth_limit])
def register(body: RegisterIn, tasks: BackgroundTasks, db: DbSession):
    """Self-registration creates STUDENT accounts only. Teachers/admins are provisioned by an admin.
    No session yet: the student first proves they own the email with the code or link we send."""
    _require_email_service()
    email = body.email.lower()
    taken = ApiError(409, "email_taken", "An account with this email already exists. Try signing in.")
    user = db.scalar(select(User).where(User.email == email))
    if user and (user.email_verified_at or user.firebase_uid):
        raise taken
    if user:
        # Never verified, so nobody has proven they own this address: the newest sign-up wins. This stops anyone
        # from parking an account on someone else's email.
        user.full_name = body.full_name
        user.password_hash = hash_password(body.password)
        user.token_version += 1
    else:
        user = User(email=email, full_name=body.full_name, password_hash=hash_password(body.password), role=Role.student)
        user.student_profile = StudentProfile()
        db.add(user)
    try:
        db.flush()
    except IntegrityError:  # concurrent registration with the same email
        db.rollback()
        raise taken
    return _send_check(db, user, tasks)


def _finish_verification(request: Request, response: Response, db, user: User) -> AuthOut:
    verification.complete(db, user)
    user.last_login_at = datetime.now(UTC)
    db.commit()
    db.refresh(user)
    return issue_session(request, response, user)


_CODE_ERRORS = {
    "invalid": (400, "invalid_code", "That code is wrong. Check the email and try again."),
    "expired": (400, "code_expired", "That code has expired. Send a new one."),
    "locked": (429, "too_many_attempts", "Too many wrong codes. Send a new one."),
}


@router.post("/verify-email", response_model=AuthOut, dependencies=[auth_limit])
def verify_email(body: VerifyCodeIn, request: Request, response: Response, db: DbSession):
    """Check the 6-digit code; on success the student is signed in."""
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if not user or user.email_verified_at or not user.is_active:
        raise ApiError(*_CODE_ERRORS["expired"])
    problem = verification.check_code(db, user, body.code)
    if problem:
        db.commit()  # keep the attempt count
        raise ApiError(*_CODE_ERRORS[problem])
    return _finish_verification(request, response, db, user)


@router.post("/verify-email/link", response_model=AuthOut, dependencies=[auth_limit])
def verify_email_link(body: VerifyLinkIn, request: Request, response: Response, db: DbSession):
    """The link in the email. Signs in whichever browser opened it."""
    user, problem = verification.user_for_token(db, body.token)
    if problem or not user or not user.is_active:
        raise ApiError(400, "link_invalid", "This link has expired or was replaced by a newer email. Send a new code.")
    return _finish_verification(request, response, db, user)


@router.post("/verify-email/resend", response_model=VerificationOut, status_code=202, dependencies=[auth_limit])
def resend_verification(body: ResendIn, tasks: BackgroundTasks, db: DbSession):
    """Same answer whether or not the address has a pending account, so it can't be used to find accounts."""
    _require_email_service()
    email = body.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user and user.is_active and not user.email_verified_at and user.password_hash:
        return _send_check(db, user, tasks)
    return VerificationOut(email=email, resend_after=get_settings().email_resend_seconds)


@router.post("/login", response_model=AuthOut, dependencies=[auth_limit])
def login(body: LoginIn, request: Request, response: Response, tasks: BackgroundTasks, db: DbSession):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    # Same error and the same bcrypt cost for an unknown email, a wrong password and a Google-only
    # account, so the response does not reveal whether an email is registered.
    ok = verify_password(body.password, (user.password_hash if user else None) or _DUMMY_HASH) and bool(user and user.password_hash)
    if not user or not ok:
        raise ApiError(401, "invalid_credentials", "Email or password is incorrect. If you signed up with Google, use Continue with Google.")
    if not user.is_active:
        raise ApiError(403, "account_disabled", "This account has been disabled. Contact support.")
    if not user.email_verified_at:
        # The password is right, so it's safe to say why: send a fresh code and point them to the verify screen.
        pending = _send_check(db, user, tasks)
        raise ApiError(403, "email_unverified", "Verify your email to sign in. We sent you a new code.",
                       details=[{"email": pending.email, "resend_after": pending.resend_after}], background=tasks)
    user.last_login_at = datetime.now(UTC)
    db.commit()
    return issue_session(request, response, user)


@router.post("/guest", response_model=AuthOut, dependencies=[Depends(rate_limit("guest", 20))])
def guest(body: GuestIn, request: Request, response: Response, db: DbSession):
    """Competition guest mode: sign in as a throwaway student, or the shared read-only teacher/admin (services/guest.py)."""
    if not get_settings().guest_access_enabled:
        raise ApiError(404, "guest_disabled", "Guest access is turned off.")
    user = guest_mode.create_student(db, body.level) if body.role == Role.student else guest_mode.ensure_staff(db, body.role)
    user.last_login_at = datetime.now(UTC)
    db.commit()
    return issue_session(request, response, user)


@router.post("/google", response_model=AuthOut, dependencies=[auth_limit])
def google(body: GoogleIn, request: Request, response: Response, db: DbSession):
    ident = verify_firebase_id_token(body.id_token)
    if ident.sign_in_provider != "google.com":
        raise ApiError(401, "invalid_google_token", "Only Google sign-in is supported here.")
    if not ident.email_verified:
        raise ApiError(409, "email_unverified", "Verify your Google email address, then try again.")
    user = db.scalar(select(User).where(User.firebase_uid == ident.uid))
    if not user:
        existing = db.scalar(select(User).where(User.email == ident.email))
        if existing:
            # Google has verified that this person owns the email. If we never verified it ourselves, a
            # password set by someone else may exist: drop it and revoke all existing sessions, making
            # Google the proof of ownership (prevents account pre-hijacking).
            if existing.password_hash and not existing.email_verified_at:
                existing.password_hash = None
                existing.token_version += 1
            if not existing.email_verified_at:
                verification.complete(db, existing)  # also voids any pending code and link
            existing.firebase_uid = ident.uid
            existing.avatar_url = existing.avatar_url or ident.picture
            user = existing
        else:
            try:
                reject_alias(ident.email)
            except ValueError as e:
                raise ApiError(400, "email_alias", f"{e}.") from None
            user = User(
                email=ident.email, full_name=(ident.name or ident.email.split("@")[0])[:120],
                firebase_uid=ident.uid, avatar_url=ident.picture, role=Role.student, email_verified_at=datetime.now(UTC),
            )
            user.student_profile = StudentProfile()
            db.add(user)
            db.flush()  # apply column defaults (is_active, token_version)
    if not user.is_active:
        raise ApiError(403, "account_disabled", "This account has been disabled. Contact support.")
    user.last_login_at = datetime.now(UTC)
    db.commit()
    db.refresh(user)
    return issue_session(request, response, user)


@router.post("/refresh", response_model=AuthOut, dependencies=[refresh_limit])
def refresh(request: Request, response: Response, db: DbSession, body: RefreshIn | None = None):
    # Tokens are returned in the body ONLY when the refresh token came in the body (native apps).
    # A cookie-based refresh always answers with cookies, so page scripts can never read the tokens.
    from_body = bool(body and body.refresh_token)
    token = body.refresh_token if from_body else request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise ApiError(401, "not_authenticated", "Sign in to continue.")
    try:
        payload = decode_token(token, "refresh")
        user = db.get(User, uuid.UUID(payload["sub"]))
    except (jwt.PyJWTError, ValueError, KeyError):
        user = None
        payload = {}
    if not user or not user.is_active or payload.get("ver") != user.token_version or is_revoked(db, payload):
        raise ApiError(401, "invalid_token", "Your session has expired. Please sign in again.")
    return issue_session(request, response, user, native=from_body, sid=payload.get("sid"))


def _cleared() -> Response:
    resp = Response(status_code=204)
    resp.delete_cookie(ACCESS_COOKIE, path="/")
    resp.delete_cookie(REFRESH_COOKIE, path="/api/auth")
    return resp


@router.post("/logout", status_code=204, response_class=Response)
def logout(request: Request, db: DbSession, body: RefreshIn | None = None):
    """Revoke this sign-in session server-side (not just the cookies): the presented tokens and every
    token refreshed from the same sign-in stop working. Native clients should send refresh_token in
    the body; the access token alone is enough to revoke the session, since both carry the same sid."""
    refresh_token = (body.refresh_token if body and body.refresh_token else None) or request.cookies.get(REFRESH_COOKIE)
    try:
        for token, kind in ((refresh_token, "refresh"), (_extract_access_token(request), "access")):
            if not token:
                continue
            try:
                revoke(db, decode_token(token, kind))
            except jwt.PyJWTError:
                pass  # expired or invalid: nothing to revoke
        db.commit()
    except IntegrityError:  # a concurrent logout committed the same revocation first
        db.rollback()
    return _cleared()


@router.post("/logout-all", status_code=204, response_class=Response)
def logout_all(user: CurrentUser, db: DbSession):
    """Revoke every session for this user (all devices)."""
    user.token_version += 1
    db.commit()
    return _cleared()


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user_out(user)
