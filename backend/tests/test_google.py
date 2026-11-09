"""Google Workspace integration with all Google HTTP calls mocked (no network)."""

import base64
import hashlib
import json
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from cryptography.fernet import Fernet

from app.core.config import get_settings
from app.models import Course, GoogleConnection, Lesson, Opportunity, User
from app.models.enums import VerificationStatus
from app.services import google as g

from .conftest import register

REAL_VERIFY_ID_TOKEN = g.verify_id_token
DRIVE = g.FEATURE_SCOPES["drive"]
CAL = g.FEATURE_SCOPES["calendar"]


class FakeGoogle:
    """Records requests and answers like Google's endpoints."""

    def __init__(self):
        self.requests: list[httpx.Request] = []
        self.token_status = 200
        self.scope = f"openid email {DRIVE}"
        self.api_401_once = False

    def __call__(self, req: httpx.Request) -> httpx.Response:
        self.requests.append(req)
        url = str(req.url)
        if url.startswith(g.TOKEN_URL):
            form = parse_qs(req.content.decode())
            if self.token_status != 200:
                return httpx.Response(self.token_status, json={"error": "invalid_grant"})
            if form["grant_type"] == ["refresh_token"]:
                return httpx.Response(200, json={"access_token": "at-refreshed", "expires_in": 3600})
            return httpx.Response(200, json={"access_token": "at-1", "refresh_token": "rt-1", "expires_in": 3600,
                                             "scope": self.scope, "id_token": "idt"})
        if url.startswith(g.REVOKE_URL):
            return httpx.Response(200)
        if self.api_401_once:
            self.api_401_once = False
            return httpx.Response(401)
        if url.startswith(g.DRIVE_UPLOAD):
            return httpx.Response(200, json={"id": "doc-1", "name": "Doc", "webViewLink": "https://docs.google.com/document/d/doc-1"})
        if url.startswith(g.DRIVE_FILES) and req.method == "POST":
            return httpx.Response(200, json={"id": "folder-1"})
        if url.startswith(g.DRIVE_FILES):
            return httpx.Response(200, json={"id": "folder-1", "trashed": False})
        if url.startswith(g.CALENDAR_EVENTS):
            return httpx.Response(200, json={"id": "ev-1", "htmlLink": "https://calendar.google.com/event?eid=ev-1"})
        return httpx.Response(404)

    def last(self, prefix: str) -> httpx.Request:
        return [r for r in self.requests if str(r.url).startswith(prefix)][-1]


@pytest.fixture()
def google(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "google_oauth_client_id", "cid.apps.googleusercontent.com")
    monkeypatch.setattr(s, "google_oauth_client_secret", "csecret")
    monkeypatch.setattr(s, "google_token_key", Fernet.generate_key().decode())
    fake = FakeGoogle()
    monkeypatch.setattr(g, "_client", lambda: httpx.Client(transport=httpx.MockTransport(fake)))
    monkeypatch.setattr(g, "verify_id_token", lambda _t: {"sub": "g-123", "email": "ayesha@gmail.com"})
    return fake


def connected(client, db_session, scopes=(DRIVE,), expires_in=3600) -> User:
    register(client)
    user = db_session.query(User).one()
    g.store_tokens(db_session, user.id, {"access_token": "at-1", "refresh_token": "rt-1", "expires_in": expires_in,
                                         "scope": " ".join(("openid", "email", *scopes))}, {"sub": "g-123", "email": "a@gmail.com"})
    db_session.commit()
    return user


def test_not_configured_reports_and_refuses(client):
    register(client)
    st = client.get("/api/google/status").json()
    assert st == {"configured": False, "connected": False, "email": None, "features": {"drive": False, "calendar": False}}
    r = client.post("/api/google/connect", json={"features": ["drive"]})
    assert r.status_code == 503 and r.json()["error"]["code"] == "google_not_configured"
    assert client.get("/api/health").json()["integrations"]["google_workspace"] is False


def test_connect_uses_pkce_minimal_scopes_and_state_cookie(client, google):
    register(client)
    r = client.post("/api/google/connect", json={"features": ["drive"]})
    assert r.status_code == 200
    q = parse_qs(urlparse(r.json()["auth_url"]).query)
    assert q["scope"] == [f"openid email {DRIVE}"]  # no calendar, no full-drive scope
    assert q["code_challenge_method"] == ["S256"] and q["access_type"] == ["offline"]
    assert q["include_granted_scopes"] == ["true"]
    assert any("la_gstate" in c and "HttpOnly" in c and "Path=/api/google" in c for c in r.headers.get_list("set-cookie"))
    assert "client_secret" not in r.json()["auth_url"] and "csecret" not in r.text


def test_full_oauth_callback_stores_encrypted_tokens(client, db_session, google):
    register(client)
    url = client.post("/api/google/connect", json={"features": ["drive", "calendar"]}).json()["auth_url"]
    q = parse_qs(urlparse(url).query)
    google.scope = f"openid email {DRIVE} {CAL}"
    r = client.get("/api/google/callback", params={"code": "auth-code", "state": q["state"][0]}, follow_redirects=False)
    assert r.status_code == 303 and r.headers["location"].endswith("/google?connected=1")

    form = parse_qs(google.last(g.TOKEN_URL).content.decode())
    verifier = form["code_verifier"][0]
    expected = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    assert expected == q["code_challenge"][0]

    conn = db_session.query(GoogleConnection).one()
    assert conn.google_sub == "g-123" and conn.google_email == "ayesha@gmail.com"
    assert "rt-1" not in conn.refresh_token_enc and "at-1" not in conn.access_token_enc
    assert g.decrypt(conn.refresh_token_enc) == "rt-1"
    st = client.get("/api/google/status").json()
    assert st["connected"] and st["features"] == {"drive": True, "calendar": True}
    assert "rt-1" not in json.dumps(st) and "at-1" not in json.dumps(st)


def test_callback_reports_unchecked_permissions(client, db_session, google):
    register(client)
    url = client.post("/api/google/connect", json={"features": ["drive", "calendar"]}).json()["auth_url"]
    state = parse_qs(urlparse(url).query)["state"][0]
    google.scope = f"openid email {DRIVE}"  # user unticked Calendar on the consent screen
    r = client.get("/api/google/callback", params={"code": "c", "state": state}, follow_redirects=False)
    assert "missing=calendar" in r.headers["location"]
    assert client.get("/api/google/status").json()["features"] == {"drive": True, "calendar": False}


@pytest.mark.parametrize("params,error", [
    ({"code": "c", "state": "forged"}, "state_mismatch"),
    ({"error": "access_denied", "state": None}, "denied"),
])
def test_callback_rejects_bad_state_and_denial(client, db_session, google, params, error):
    register(client)
    url = client.post("/api/google/connect", json={"features": ["drive"]}).json()["auth_url"]
    state = parse_qs(urlparse(url).query)["state"][0]
    params = {k: (state if v is None else v) for k, v in params.items()}
    r = client.get("/api/google/callback", params=params, follow_redirects=False)
    assert r.headers["location"].endswith(f"error={error}")
    assert db_session.query(GoogleConnection).count() == 0


def test_callback_without_state_cookie_is_rejected(client, db_session, google):
    r = client.get("/api/google/callback", params={"code": "c", "state": "s"}, follow_redirects=False)
    assert r.headers["location"].endswith("error=expired")
    assert db_session.query(GoogleConnection).count() == 0


def _lesson(db_session) -> Lesson:
    c = Course(title="AI Basics", slug="ai-basics", level="college", is_published=True)
    lesson = Lesson(course=c, title="What is AI?", content_md="# Hello\n\nAI is **useful**.")
    db_session.add(c)
    db_session.commit()
    return lesson


def test_save_lesson_to_google_docs(client, db_session, google):
    connected(client, db_session)
    lesson = _lesson(db_session)
    r = client.post("/api/google/drive/lesson", json={"lesson_id": str(lesson.id), "notes": "<script>x</script> my note"})
    assert r.status_code == 201 and r.json()["web_view_link"].startswith("https://docs.google.com/")
    up = google.last(g.DRIVE_UPLOAD)
    body = up.content.decode()
    assert "application/vnd.google-apps.document" in body and '"parents": ["folder-1"]' in body
    assert "<strong>useful</strong>" in body and "&lt;script&gt;" in body and "<script>" not in body
    assert up.headers["Authorization"] == "Bearer at-1"
    assert db_session.query(GoogleConnection).one().drive_folder_id == "folder-1"


def test_drive_needs_permission_and_connection(client, db_session, google):
    connected(client, db_session, scopes=(CAL,))
    lesson = _lesson(db_session)
    r = client.post("/api/google/drive/lesson", json={"lesson_id": str(lesson.id)})
    assert r.status_code == 409 and r.json()["error"]["code"] == "google_scope_missing"
    client.post("/api/google/disconnect")
    r = client.post("/api/google/drive/lesson", json={"lesson_id": str(lesson.id)})
    assert r.json()["error"]["code"] == "google_not_connected"


def _opportunity(db_session, status=VerificationStatus.verified, days=30) -> Opportunity:
    o = Opportunity(title="Test Award", description="Test only.", category="merit_scholarship", provider="Test Org",
                    eligibility="Test", education_levels=[], official_url="https://www.example.org/award",
                    deadline=datetime.now(UTC) + timedelta(days=days), verification_status=status)
    db_session.add(o)
    db_session.commit()
    return o


def test_calendar_deadline_for_verified_opportunity_only(client, db_session, google):
    connected(client, db_session, scopes=(CAL,))
    o = _opportunity(db_session)
    r = client.post("/api/google/calendar/opportunity", json={"opportunity_id": str(o.id)})
    assert r.status_code == 201 and r.json()["id"] == "ev-1"
    ev = json.loads(google.last(g.CALENDAR_EVENTS).content)
    assert "date" in ev["start"] and ev["summary"] == "Deadline: Test Award"
    assert [x["minutes"] for x in ev["reminders"]["overrides"]] == [10080, 1440]
    hidden = _opportunity(db_session, status=VerificationStatus.unverified)
    assert client.post("/api/google/calendar/opportunity", json={"opportunity_id": str(hidden.id)}).status_code == 404


def test_custom_reminder_validation(client, db_session, google):
    connected(client, db_session, scopes=(CAL,))
    start = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    r = client.post("/api/google/calendar/reminder", json={"title": "Physics exam", "kind": "exam", "starts_at": start})
    assert r.status_code == 201
    ev = json.loads(google.last(g.CALENDAR_EVENTS).content)
    assert ev["summary"] == "Exam: Physics exam" and ev["start"]["timeZone"] == "Asia/Dhaka"
    past = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    assert client.post("/api/google/calendar/reminder", json={"title": "Old", "starts_at": past}).status_code == 422


def test_expired_access_token_is_refreshed(client, db_session, google):
    connected(client, db_session, scopes=(CAL,), expires_in=0)
    start = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    assert client.post("/api/google/calendar/reminder", json={"title": "Study", "starts_at": start}).status_code == 201
    assert google.last(g.CALENDAR_EVENTS).headers["Authorization"] == "Bearer at-refreshed"
    assert g.decrypt(db_session.query(GoogleConnection).one().access_token_enc) == "at-refreshed"


def test_revoked_grant_asks_to_reconnect(client, db_session, google):
    connected(client, db_session, scopes=(CAL,), expires_in=0)
    google.token_status = 400
    start = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    r = client.post("/api/google/calendar/reminder", json={"title": "Study", "starts_at": start})
    assert r.status_code == 409 and r.json()["error"]["code"] == "google_reconnect_required"
    assert db_session.query(GoogleConnection).count() == 0


def test_bad_client_secret_never_deletes_connections(client, db_session, google, monkeypatch):
    connected(client, db_session, scopes=(CAL,), expires_in=0)
    google.token_status = 401
    real = FakeGoogle.__call__

    def invalid_client(self, req):
        if str(req.url).startswith(g.TOKEN_URL):
            return httpx.Response(401, json={"error": "invalid_client"})
        return real(self, req)

    monkeypatch.setattr(FakeGoogle, "__call__", invalid_client)
    start = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    r = client.post("/api/google/calendar/reminder", json={"title": "Study", "starts_at": start})
    assert r.status_code == 503 and r.json()["error"]["code"] == "google_not_configured"
    assert db_session.query(GoogleConnection).count() == 1


def test_callback_survives_id_token_transport_error(client, db_session, google, monkeypatch):
    """Google's certificate fetch failing must redirect with an error, not crash with a 500."""
    from google.auth.exceptions import TransportError
    from google.oauth2 import id_token

    def unreachable(*_a, **_k):
        raise TransportError("certs unreachable")

    monkeypatch.setattr(g, "verify_id_token", REAL_VERIFY_ID_TOKEN)
    monkeypatch.setattr(id_token, "verify_oauth2_token", unreachable)
    register(client)
    url = client.post("/api/google/connect", json={"features": ["drive"]}).json()["auth_url"]
    state = parse_qs(urlparse(url).query)["state"][0]
    r = client.get("/api/google/callback", params={"code": "c", "state": state}, follow_redirects=False)
    assert r.headers["location"].endswith("error=exchange_failed")
    assert db_session.query(GoogleConnection).count() == 0


def test_admin_routes_forbidden_for_teachers(client, db_session):
    from app.core.security import create_token, hash_password
    from app.models import Role

    t = User(email="t@example.com", full_name="Teacher", role=Role.teacher, password_hash=hash_password("secret123"))
    db_session.add(t)
    db_session.commit()
    h = {"Authorization": f"Bearer {create_token(t.id, t.role, 0, 'access')}"}
    assert client.get("/api/admin/opportunities", headers=h).status_code == 403


def test_disconnect_revokes_at_google_and_deletes_tokens(client, db_session, google):
    connected(client, db_session)
    assert client.post("/api/google/disconnect").status_code == 204
    assert parse_qs(google.last(g.REVOKE_URL).content.decode())["token"] == ["rt-1"]
    assert db_session.query(GoogleConnection).count() == 0
