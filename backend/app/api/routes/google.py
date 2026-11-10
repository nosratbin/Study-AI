"""Google Workspace: connect (OAuth 2.0 + PKCE), save lessons to Google Docs, add Calendar reminders."""

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import jwt
from fastapi import APIRouter, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.core.rate_limit import limiter
from app.models import GoogleConnection, Lesson, User
from app.schemas.google import (
    CalendarOpportunityIn,
    ConnectIn,
    ConnectOut,
    DocOut,
    DriveLessonIn,
    EventOut,
    GoogleFeatures,
    GoogleStatus,
    ReminderIn,
)
from app.services import google as g
from app.services.opportunities import aware, get_verified

router = APIRouter(prefix="/google", tags=["google"])

STATE_COOKIE = "la_gstate"
STATE_PATH = "/api/google"
STATE_TTL = 600


def _limit(user: User) -> None:
    wait = limiter.hit(f"google:{user.id}", 20, 60)
    if wait is not None:
        raise ApiError(429, "rate_limited", "Too many Google requests. Please wait a moment.", headers={"Retry-After": str(int(wait) + 1)})


def _conn(db, user: User) -> GoogleConnection | None:
    return db.query(GoogleConnection).filter_by(user_id=user.id).one_or_none()


def _api_for(db, user: User, feature: str) -> g.GoogleApi:
    g.require_configured()
    _limit(user)
    conn = _conn(db, user)
    if not conn:
        raise ApiError(409, "google_not_connected", "Connect your Google account first.")
    if not g.has_feature(conn, feature):
        raise ApiError(409, "google_scope_missing", f"Give LEARN AI permission to use Google {feature.title()} first.")
    return g.GoogleApi(db, conn)


def _status(db, user: User) -> GoogleStatus:
    s = get_settings()
    conn = _conn(db, user)
    return GoogleStatus(
        configured=s.google_enabled, connected=conn is not None, email=conn.google_email if conn else None,
        features=GoogleFeatures(drive=g.has_feature(conn, "drive"), calendar=g.has_feature(conn, "calendar")),
    )


@router.get("/status", response_model=GoogleStatus)
def status(user: CurrentUser, db: DbSession):
    return _status(db, user)


@router.post("/connect", response_model=ConnectOut)
def connect(body: ConnectIn, user: CurrentUser, db: DbSession, response: Response):
    """Start OAuth. The PKCE verifier and state live in a signed, short-lived, httpOnly cookie."""
    g.require_configured()
    _limit(user)
    s = get_settings()
    features = sorted(set(body.features))
    verifier, challenge = g.pkce_pair()
    state = secrets.token_urlsafe(24)
    now = datetime.now(UTC)
    cookie = jwt.encode({
        "typ": "google_state", "sub": str(user.id), "ver": user.token_version, "state": state,
        "verifier": verifier, "features": features, "iat": now, "exp": now + timedelta(seconds=STATE_TTL),
    }, s.jwt_secret, algorithm=s.jwt_algorithm)
    response.set_cookie(STATE_COOKIE, cookie, max_age=STATE_TTL, path=STATE_PATH, httponly=True,
                        secure=s.cookie_secure, samesite="lax")
    conn = _conn(db, user)
    hint = (conn.google_email if conn else None) or user.email
    return ConnectOut(auth_url=g.auth_url(state, challenge, g.scopes_for(features), hint))


def _back(**params) -> RedirectResponse:
    resp = RedirectResponse(f"{get_settings().web_app_url}/google?{urlencode(params)}", status_code=303)
    resp.delete_cookie(STATE_COOKIE, path=STATE_PATH)
    return resp


@router.get("/callback", include_in_schema=False)
def callback(
    request: Request,
    db: DbSession,
    code: str | None = Query(default=None, max_length=2048),
    state: str | None = Query(default=None, max_length=200),
    error: str | None = Query(default=None, max_length=100),
):
    """Google redirects the browser here. The signed state cookie (set by /connect for this user and this
    browser) is the proof of who started the flow, so an expired access cookie during consent is fine."""
    s = get_settings()
    if not s.google_enabled:
        return _back(error="not_configured")
    try:
        st = jwt.decode(request.cookies.get(STATE_COOKIE) or "", s.jwt_secret, algorithms=[s.jwt_algorithm],
                        options={"require": ["exp", "sub", "state", "verifier"]})
        if st.get("typ") != "google_state":
            raise jwt.InvalidTokenError("wrong type")
    except jwt.PyJWTError:
        return _back(error="expired")
    if not state or not secrets.compare_digest(state, st["state"]):
        return _back(error="state_mismatch")
    if error:
        return _back(error="denied" if error == "access_denied" else "google_error")
    if not code:
        return _back(error="google_error")

    user = db.get(User, uuid.UUID(st["sub"]))
    if not user or not user.is_active or user.token_version != st.get("ver"):
        return _back(error="session")
    try:
        tokens = g.exchange_code(code, st["verifier"])
        claims = g.verify_id_token(tokens.get("id_token") or "")
    except ApiError:
        return _back(error="exchange_failed")
    if not claims.get("sub") or not tokens.get("access_token"):
        return _back(error="exchange_failed")
    try:
        g.store_tokens(db, user.id, tokens, claims)
        db.commit()
    except (ApiError, SQLAlchemyError):
        db.rollback()
        return _back(error="exchange_failed")
    granted = set((tokens.get("scope") or "").split())
    missing = [f for f in st.get("features", []) if g.FEATURE_SCOPES[f] not in granted]
    return _back(connected="1", **({"missing": ",".join(missing)} if missing else {}))


@router.post("/disconnect", status_code=204, response_class=Response)
def disconnect(user: CurrentUser, db: DbSession):
    """Revoke LEARN AI's access at Google and delete the stored tokens. Files and events already created stay."""
    conn = _conn(db, user)
    if conn:
        if get_settings().google_enabled:
            try:
                g.revoke(conn)
            except ApiError:
                pass  # e.g. a malformed token key: still delete the local copy
        db.delete(conn)
        db.commit()
    return Response(status_code=204)


@router.post("/drive/lesson", response_model=DocOut, status_code=201)
def save_lesson(body: DriveLessonIn, user: CurrentUser, db: DbSession, response: Response):
    """Save a lesson (plus the student's own notes) as a Google Doc in their LEARN AI Drive folder.

    Returns the Doc saved earlier (200, existing=true) unless new_copy is set, so a repeat click never duplicates it.
    """
    api = _api_for(db, user, "drive")
    lesson = db.get(Lesson, body.lesson_id)
    if not lesson or not lesson.course.is_published:
        raise ApiError(404, "lesson_not_found", "Lesson not found.")
    if not body.new_copy and (f := api.find_lesson_doc(lesson.id)):
        response.status_code = 200
        return DocOut(id=f["id"], name=f.get("name", lesson.title), web_view_link=f.get("webViewLink"), existing=True)
    s = get_settings()
    body_html = g.lesson_doc_html(
        title=lesson.title, course_title=lesson.course.title, level=str(getattr(lesson.course.level, "value", lesson.course.level)),
        content_md=lesson.content_md or "", lesson_url=f"{s.web_app_url}/lessons/{lesson.id}", notes=body.notes,
    )
    f = api.create_doc(f"{lesson.title} · LEARN AI notes", body_html, lesson_id=lesson.id)
    return DocOut(id=f["id"], name=f.get("name", lesson.title), web_view_link=f.get("webViewLink"))


@router.post("/calendar/opportunity", response_model=EventOut, status_code=201)
def opportunity_deadline(body: CalendarOpportunityIn, user: CurrentUser, db: DbSession, response: Response):
    """Add a verified opportunity's deadline (all-day, reminders 7 days and 1 day before).

    One event per student and opportunity: adding it again updates it (e.g. after the deadline changed).
    """
    api = _api_for(db, user, "calendar")
    o = get_verified(db, body.opportunity_id)
    if not o:
        raise ApiError(404, "opportunity_not_found", "This opportunity is not available.")
    deadline = aware(o.deadline)
    if deadline is None:
        raise ApiError(422, "no_deadline", "This opportunity has no announced deadline yet.")
    if deadline < datetime.now(UTC):
        raise ApiError(422, "deadline_passed", "This deadline has already passed.")
    s = get_settings()
    ev, created = api.put_event(
        g.event_id("deadline", user.id, o.id),
        g.deadline_event(title=o.title, provider=o.provider, deadline=deadline, official_url=o.official_url,
                         page_url=f"{s.web_app_url}/opportunities-hub/{o.id}"),
    )
    if not created:
        response.status_code = 200
    return EventOut(id=ev["id"], html_link=ev.get("htmlLink"), created=created)


@router.post("/calendar/reminder", response_model=EventOut, status_code=201)
def reminder(body: ReminderIn, user: CurrentUser, db: DbSession, response: Response):
    """A class, exam or study-session reminder the student sets up themselves."""
    api = _api_for(db, user, "calendar")
    ev, created = api.put_event(
        g.event_id("reminder", user.id, body.request_id),
        g.reminder_event(title=body.title, kind=body.kind, starts_at=body.starts_at, duration_min=body.duration_min,
                         notes=body.notes, remind_minutes=body.remind_minutes),
    )
    if not created:
        response.status_code = 200
    return EventOut(id=ev["id"], html_link=ev.get("htmlLink"), created=created)
