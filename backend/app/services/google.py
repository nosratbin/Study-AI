"""Google Workspace integration: server-side OAuth 2.0 (PKCE) plus Drive, Docs and Calendar over REST.

Scopes are the narrowest that do the job and are requested per feature (incremental authorization):
- drive.file: only files this app creates (a "LEARN AI" folder and the Google Docs saved into it).
  Docs are created by uploading HTML to Drive with conversion, so no separate Docs scope is needed.
- calendar.events: create reminder events; no access to other calendar settings.
Tokens are encrypted at rest with Fernet and never sent to the browser.
"""

import base64
import hashlib
import html
import json
import secrets
import uuid
from datetime import UTC, date, datetime, timedelta, timezone
from urllib.parse import quote, urlencode

import httpx
import markdown as md
import nh3
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import ApiError
from app.models import GoogleConnection

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
REVOKE_URL = "https://oauth2.googleapis.com/revoke"
DRIVE_FILES = "https://www.googleapis.com/drive/v3/files"
DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files"
CALENDAR_API = "https://www.googleapis.com/calendar/v3"

FEATURE_SCOPES = {
    "drive": "https://www.googleapis.com/auth/drive.file",
    # Only calendars this app creates (a "LEARN AI" calendar): no access to the student's own calendars or events.
    "calendar": "https://www.googleapis.com/auth/calendar.app.created",
}
BASE_SCOPES = ["openid", "email"]
FOLDER_NAME = "LEARN AI"
CALENDAR_NAME = "LEARN AI"
LESSON_PROP = "learnai_lesson"  # Drive appProperties key: which lesson a Doc was saved from
DHAKA = timezone(timedelta(hours=6), "Asia/Dhaka")  # Bangladesh has no DST


def _client() -> httpx.Client:
    """Overridden in tests with an httpx.MockTransport."""
    return httpx.Client(timeout=20)


def verify_id_token(token: str) -> dict:
    """Verify the OpenID id_token from the code exchange (signature, audience, expiry). Overridden in tests."""
    from google.auth.transport import requests as g_requests
    from google.oauth2 import id_token

    from google.auth.exceptions import GoogleAuthError

    try:
        return id_token.verify_oauth2_token(token, g_requests.Request(), get_settings().google_oauth_client_id)
    except (ValueError, GoogleAuthError):
        raise ApiError(502, "google_exchange_failed", "Google sign-in could not be verified. Please try again.")


def require_configured() -> None:
    if not get_settings().google_enabled:
        raise ApiError(503, "google_not_configured", "Google Workspace is not configured on this server yet.")


# ---------- token encryption ----------


def _fernet() -> Fernet:
    try:
        return Fernet(get_settings().google_token_key.encode())
    except (ValueError, TypeError):
        raise ApiError(503, "google_not_configured", "GOOGLE_TOKEN_KEY is not a valid Fernet key.")


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken:
        return None  # key rotated: treated as "reconnect needed"


# ---------- OAuth ----------


def pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    return verifier, challenge


def scopes_for(features: list[str]) -> list[str]:
    return BASE_SCOPES + [FEATURE_SCOPES[f] for f in features]


def auth_url(state: str, challenge: str, scopes: list[str], login_hint: str | None) -> str:
    s = get_settings()
    params = {
        "client_id": s.google_oauth_client_id,
        "redirect_uri": s.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",  # always return a refresh token, including when adding a scope later
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    if login_hint:
        params["login_hint"] = login_hint
    return f"{AUTH_URL}?{urlencode(params)}"


def exchange_code(code: str, verifier: str) -> dict:
    s = get_settings()
    try:
        with _client() as c:
            r = c.post(TOKEN_URL, data={
                "code": code, "client_id": s.google_oauth_client_id, "client_secret": s.google_oauth_client_secret,
                "redirect_uri": s.google_oauth_redirect_uri, "grant_type": "authorization_code", "code_verifier": verifier,
            })
    except httpx.HTTPError:
        raise ApiError(502, "google_unavailable", "Google is not responding. Please try again shortly.")
    if r.status_code != 200:
        raise ApiError(502, "google_exchange_failed", "Google did not accept the sign-in. Please try connecting again.")
    return r.json()


def store_tokens(db: Session, user_id: uuid.UUID, tokens: dict, claims: dict) -> GoogleConnection:
    conn = db.query(GoogleConnection).filter_by(user_id=user_id).one_or_none()
    if conn and conn.google_sub != claims["sub"]:
        # A different Google account: start fresh (the old folder id belongs to the other account).
        db.delete(conn)
        db.flush()
        conn = None
    if conn is None:
        conn = GoogleConnection(user_id=user_id, google_sub=claims["sub"], scopes=[])
        db.add(conn)
    conn.google_email = claims.get("email")
    granted = set((tokens.get("scope") or "").split())
    conn.scopes = sorted(granted | set(conn.scopes or []))
    conn.access_token_enc = encrypt(tokens["access_token"])
    conn.expires_at = datetime.now(UTC) + timedelta(seconds=int(tokens.get("expires_in", 3600)))
    if tokens.get("refresh_token"):
        conn.refresh_token_enc = encrypt(tokens["refresh_token"])
    return conn


def revoke(conn: GoogleConnection) -> None:
    token = decrypt(conn.refresh_token_enc) or decrypt(conn.access_token_enc)
    if not token:
        return
    try:
        with _client() as c:
            c.post(REVOKE_URL, data={"token": token})
    except httpx.HTTPError:
        pass  # best effort: the local copy is deleted either way


def has_feature(conn: GoogleConnection | None, feature: str) -> bool:
    return bool(conn and FEATURE_SCOPES[feature] in (conn.scopes or []))


def _oauth_error(r: httpx.Response) -> str | None:
    try:
        return r.json().get("error")
    except ValueError:
        return None


# ---------- API client ----------


class GoogleApi:
    def __init__(self, db: Session, conn: GoogleConnection):
        self.db, self.conn = db, conn

    def _reconnect(self) -> ApiError:
        self.db.delete(self.conn)
        self.db.commit()
        return ApiError(409, "google_reconnect_required", "Your Google connection expired. Connect Google again to continue.")

    def _refresh(self) -> str:
        s = get_settings()
        rt = decrypt(self.conn.refresh_token_enc)
        if not rt:
            raise self._reconnect()
        try:
            with _client() as c:
                r = c.post(TOKEN_URL, data={"client_id": s.google_oauth_client_id, "client_secret": s.google_oauth_client_secret,
                                            "refresh_token": rt, "grant_type": "refresh_token"})
        except httpx.HTTPError:
            raise ApiError(502, "google_unavailable", "Google is not responding. Please try again shortly.")
        if r.status_code in (400, 401) and _oauth_error(r) == "invalid_grant":
            raise self._reconnect()  # the student revoked access or the grant expired
        if r.status_code in (400, 401):
            # e.g. invalid_client after a secret rotation: a server problem, never delete students' connections
            raise ApiError(503, "google_not_configured", "Google Workspace is misconfigured on this server. Please tell an administrator.")
        if r.status_code != 200:
            raise ApiError(502, "google_unavailable", "Google is not responding. Please try again shortly.")
        data = r.json()
        self.conn.access_token_enc = encrypt(data["access_token"])
        self.conn.expires_at = datetime.now(UTC) + timedelta(seconds=int(data.get("expires_in", 3600)))
        self.db.commit()
        return data["access_token"]

    def _token(self) -> str:
        exp = self.conn.expires_at
        if exp is not None and exp.tzinfo is None:
            exp = exp.replace(tzinfo=UTC)
        token = decrypt(self.conn.access_token_enc)
        if token and exp and exp > datetime.now(UTC) + timedelta(seconds=60):
            return token
        return self._refresh()

    def request(self, method: str, url: str, **kw) -> dict:
        for attempt in range(2):
            token = self._token() if attempt == 0 else self._refresh()
            headers = {**kw.pop("headers", {}), "Authorization": f"Bearer {token}"}
            try:
                with _client() as c:
                    r = c.request(method, url, headers=headers, **kw)
            except httpx.HTTPError:
                raise ApiError(502, "google_unavailable", "Google is not responding. Please try again shortly.")
            if r.status_code == 401:
                if attempt == 0:
                    kw["headers"] = {k: v for k, v in headers.items() if k != "Authorization"}
                    continue
                raise self._reconnect()
            if r.status_code == 404:
                raise ApiError(404, "google_not_found", "That Google file no longer exists.")
            if r.status_code == 409:
                raise ApiError(409, "google_conflict", "That item already exists in Google.")
            if r.status_code == 403 and "insufficient" in r.text.lower():
                raise ApiError(409, "google_scope_missing", "Give LEARN AI permission for this Google feature first.")
            if r.status_code >= 400:
                raise ApiError(502, "google_api_error", "Google could not complete the request. Please try again.")
            return r.json() if r.content else {}
        raise self._reconnect()  # unreachable: the loop always returns or raises

    # ----- Drive / Docs -----

    def folder_id(self) -> str:
        if self.conn.drive_folder_id:
            try:
                f = self.request("GET", f"{DRIVE_FILES}/{self.conn.drive_folder_id}", params={"fields": "id,trashed"})
                if not f.get("trashed"):
                    return f["id"]
            except ApiError as e:
                if e.code != "google_not_found":  # only a deleted folder is recreated; outages propagate
                    raise
        f = self.request("POST", DRIVE_FILES, params={"fields": "id"},
                         json={"name": FOLDER_NAME, "mimeType": "application/vnd.google-apps.folder"})
        self.conn.drive_folder_id = f["id"]
        self.db.commit()
        return f["id"]

    def find_lesson_doc(self, lesson_id: uuid.UUID) -> dict | None:
        """The newest non-trashed Doc this app saved for a lesson. drive.file only lists files the app created."""
        q = f"appProperties has {{ key='{LESSON_PROP}' and value='{lesson_id}' }} and trashed = false"
        r = self.request("GET", DRIVE_FILES, params={"q": q, "fields": "files(id,name,webViewLink)", "pageSize": 1,
                                                     "orderBy": "createdTime desc", "spaces": "drive"})
        files = r.get("files") or []
        return files[0] if files else None

    def create_doc(self, title: str, body_html: str, lesson_id: uuid.UUID | None = None) -> dict:
        folder = self.folder_id()
        boundary = f"learnai-{secrets.token_hex(8)}"
        meta: dict = {"name": title[:200], "mimeType": "application/vnd.google-apps.document", "parents": [folder]}
        if lesson_id:
            meta["appProperties"] = {LESSON_PROP: str(lesson_id)}
        payload = (
            f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{json.dumps(meta)}\r\n"
            f"--{boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n{body_html}\r\n--{boundary}--\r\n"
        ).encode("utf-8")
        return self.request("POST", DRIVE_UPLOAD, params={"uploadType": "multipart", "fields": "id,name,webViewLink"},
                            content=payload, headers={"Content-Type": f"multipart/related; boundary={boundary}"})

    # ----- Calendar -----

    def calendar_id(self) -> str:
        if self.conn.calendar_id:
            return self.conn.calendar_id
        c = self.request("POST", f"{CALENDAR_API}/calendars", params={"fields": "id"}, json={
            "summary": CALENDAR_NAME, "timeZone": "Asia/Dhaka",
            "description": "Deadlines and study reminders added from LEARN AI. You can hide or delete this calendar any time.",
        })
        self.conn.calendar_id = c["id"]
        self.db.commit()
        return c["id"]

    def put_event(self, event_id: str, event: dict) -> tuple[dict, bool]:
        """Create the event with a client-chosen id, or update it if that id already exists.

        Google keeps a deleted event's id reserved (status "cancelled"), so a repeat request updates the
        existing event and marks it confirmed instead of creating a duplicate. Returns (event, created).
        """
        fields = {"fields": "id,htmlLink"}
        for attempt in range(2):
            events = f"{CALENDAR_API}/calendars/{quote(self.calendar_id(), safe='')}/events"
            try:
                try:
                    return self.request("POST", events, params=fields, json={**event, "id": event_id}), True
                except ApiError as e:
                    if e.code != "google_conflict":
                        raise
                return self.request("PUT", f"{events}/{event_id}", params=fields, json={**event, "status": "confirmed"}), False
            except ApiError as e:
                if e.code != "google_not_found" or attempt:
                    raise
                self.conn.calendar_id = None  # the student deleted the LEARN AI calendar: make a new one
                self.db.commit()
        raise ApiError(502, "google_api_error", "Google could not complete the request. Please try again.")  # unreachable


def event_id(*parts: object) -> str:
    """Deterministic Calendar event id (base32hex: a-v, 0-9) so retries and repeats never duplicate events."""
    digest = hashlib.sha256("|".join(map(str, parts)).encode()).digest()
    return base64.b32hexencode(digest).decode().rstrip("=").lower()


# ---------- content builders ----------


# What a lesson may contain once exported to Google Docs. Anything else (script, iframe, style, event
# handlers, javascript:/data: links, images that would phone home) is dropped by nh3 (ammonia).
DOC_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "del",
            "code", "pre", "blockquote", "ul", "ol", "li", "a", "table", "thead", "tbody", "tr", "th", "td"}
DOC_ATTRS = {"a": {"href"}, "th": {"align"}, "td": {"align"}, "ol": {"start"}}


def lesson_body_html(content_md: str) -> str:
    raw = md.markdown(content_md, extensions=["fenced_code", "tables", "sane_lists"])
    return nh3.clean(raw, tags=DOC_TAGS, attributes=DOC_ATTRS, url_schemes={"http", "https", "mailto"},
                     link_rel="noopener noreferrer")


def lesson_doc_html(*, title: str, course_title: str, level: str, content_md: str, lesson_url: str, notes: str | None) -> str:
    # Lesson markdown is sanitized to an allowlist (defence in depth: it is staff-authored); student notes are escaped.
    body = lesson_body_html(content_md)
    saved = datetime.now(DHAKA).strftime("%d %b %Y")
    parts = [
        f"<h1>{html.escape(title)}</h1>",
        f"<p><i>{html.escape(course_title)} · {html.escape(level.title())} level · saved from LEARN AI on {saved}</i></p>",
        f'<p>Open the lesson: <a href="{html.escape(lesson_url)}">{html.escape(lesson_url)}</a></p><hr>',
        body,
    ]
    if notes:
        parts += ["<hr><h2>My notes</h2>", "<p>" + html.escape(notes).replace("\n", "<br>") + "</p>"]
    return "<html><head><meta charset='utf-8'></head><body>" + "".join(parts) + "</body></html>"


def deadline_event(*, title: str, provider: str, deadline: datetime, official_url: str, page_url: str) -> dict:
    day: date = deadline.astimezone(DHAKA).date()
    local = deadline.astimezone(DHAKA).strftime("%d %b %Y, %I:%M %p")
    return {
        "summary": f"Deadline: {title}"[:250],
        "description": (
            f"{provider}\nDeadline: {local} (Bangladesh time)\n\nOfficial page: {official_url}\n"
            f"In LEARN AI: {page_url}\n\nVerified by LEARN AI. Always confirm details on the official website."
        ),
        "start": {"date": day.isoformat()},
        "end": {"date": (day + timedelta(days=1)).isoformat()},
        "reminders": {"useDefault": False, "overrides": [
            {"method": "popup", "minutes": 7 * 24 * 60}, {"method": "popup", "minutes": 24 * 60},
        ]},
        "transparency": "transparent",
    }


def reminder_event(*, title: str, kind: str, starts_at: datetime, duration_min: int, notes: str | None, remind_minutes: int) -> dict:
    start = starts_at.astimezone(DHAKA)
    end = start + timedelta(minutes=duration_min)
    label = {"class": "Class", "exam": "Exam", "study": "Study session", "other": "Reminder"}[kind]
    return {
        "summary": f"{label}: {title}"[:250],
        "description": (notes or "") + ("\n\n" if notes else "") + "Created with LEARN AI.",
        "start": {"dateTime": start.isoformat(), "timeZone": "Asia/Dhaka"},
        "end": {"dateTime": end.isoformat(), "timeZone": "Asia/Dhaka"},
        "reminders": {"useDefault": False, "overrides": [{"method": "popup", "minutes": remind_minutes}]},
    }
