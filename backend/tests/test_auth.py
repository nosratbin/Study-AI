from app.core.deps import ACCESS_COOKIE, REFRESH_COOKIE
from app.core.security import create_token
from app.models import Role, User

from .conftest import register


def test_register_sets_httponly_cookies_and_hides_tokens(client):
    r = register(client)
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["role"] == "student"
    assert body["user"]["onboarding_completed"] is False
    assert body["access_token"] is None  # web never receives tokens in JS
    set_cookie = r.headers.get_list("set-cookie")
    assert any(ACCESS_COOKIE in c and "HttpOnly" in c for c in set_cookie)
    assert any(REFRESH_COOKIE in c and "Path=/api/auth" in c for c in set_cookie)
    assert "password_hash" not in r.text


def test_mobile_client_gets_bearer_tokens(client):
    r = register(client, mobile=True)
    assert r.status_code == 201
    tokens = r.json()
    client.cookies.clear()
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200


def test_register_duplicate_email_case_insensitive(client):
    register(client)
    r = register(client, email="AYESHA@example.com")
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "email_taken"


def test_register_validation(client):
    r = client.post("/api/auth/register", json={"full_name": "A", "email": "nope", "password": "short"})
    assert r.status_code == 422
    fields = {d["field"] for d in r.json()["error"]["details"]}
    assert {"full_name", "email", "password"} <= fields
    r = register(client, password="lettersonly")
    assert r.status_code == 422


def test_register_cannot_choose_role(client):
    r = client.post("/api/auth/register", json={
        "full_name": "Sneaky", "email": "s@example.com", "password": "secret123", "role": "admin"})
    assert r.status_code == 201
    assert r.json()["user"]["role"] == "student"


def test_login_success_and_failure(client):
    register(client)
    client.cookies.clear()
    bad = client.post("/api/auth/login", json={"email": "ayesha@example.com", "password": "wrong123"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "invalid_credentials"
    unknown = client.post("/api/auth/login", json={"email": "who@example.com", "password": "wrong123"})
    assert unknown.status_code == 401 and unknown.json()["error"]["code"] == "invalid_credentials"
    ok = client.post("/api/auth/login", json={"email": "Ayesha@Example.com", "password": "secret123"})
    assert ok.status_code == 200
    assert client.get("/api/auth/me").json()["email"] == "ayesha@example.com"


def test_me_requires_auth(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "not_authenticated"


def test_refresh_and_logout(client):
    register(client)
    r = client.post("/api/auth/refresh")
    assert r.status_code == 200
    out = client.post("/api/auth/logout")
    assert out.status_code == 204
    client.cookies.clear()
    assert client.get("/api/auth/me").status_code == 401


def test_logout_revokes_copied_cookie_tokens(client):
    """A token copied before logout must stop working, not just disappear from the browser."""
    register(client)
    access, refresh = client.cookies.get("la_access"), client.cookies.get("la_refresh")
    assert client.post("/api/auth/logout").status_code == 204
    client.cookies.clear()
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {access}"}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": refresh}).status_code == 401


def test_mobile_logout_revokes_body_refresh_token(client):
    tokens = register(client, mobile=True).json()
    h = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert client.post("/api/auth/logout", json={"refresh_token": tokens["refresh_token"]}, headers=h).status_code == 204
    assert client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401
    assert client.get("/api/auth/me", headers=h).status_code == 401


def test_logout_revokes_pairs_an_attacker_refreshed_earlier(client):
    """Stolen refresh token, refreshed before the victim logs out: the attacker's new pair must die too."""
    victim = register(client, mobile=True).json()
    client.cookies.clear()
    stolen = client.post("/api/auth/refresh", json={"refresh_token": victim["refresh_token"]}).json()
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {stolen['access_token']}"}).status_code == 200
    h = {"Authorization": f"Bearer {victim['access_token']}"}
    assert client.post("/api/auth/logout", json={"refresh_token": victim["refresh_token"]}, headers=h).status_code == 204
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {stolen['access_token']}"}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": stolen["refresh_token"]}).status_code == 401


def test_logout_with_access_token_only_revokes_the_session(client):
    tokens = register(client, mobile=True).json()
    client.cookies.clear()
    h = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert client.post("/api/auth/logout", headers=h).status_code == 204
    assert client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401


def test_logout_is_idempotent_and_other_sessions_survive(client):
    first = register(client, mobile=True).json()
    client.cookies.clear()
    second = client.post("/api/auth/login", json={"email": "ayesha@example.com", "password": "secret123"},
                         headers={"X-Client-Type": "mobile"}).json()
    h = {"Authorization": f"Bearer {first['access_token']}"}
    for _ in range(2):
        assert client.post("/api/auth/logout", json={"refresh_token": first["refresh_token"]}, headers=h).status_code == 204
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {second['access_token']}"}).status_code == 200


def test_token_without_jti_is_rejected(client, db_session):
    import jwt

    from app.core.config import get_settings

    register(client)
    client.cookies.clear()
    user = db_session.query(User).one()
    s = get_settings()
    token = jwt.encode({"sub": str(user.id), "typ": "access", "ver": user.token_version, "exp": 4102444800},
                       s.jwt_secret, algorithm=s.jwt_algorithm)
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_login_errors_do_not_reveal_registered_emails(client, db_session):
    register(client)
    client.cookies.clear()
    unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "secret123"})
    wrong = client.post("/api/auth/login", json={"email": "ayesha@example.com", "password": "wrong-pass1"})
    user = db_session.query(User).one()
    user.password_hash = None  # Google-only account
    db_session.commit()
    google_only = client.post("/api/auth/login", json={"email": "ayesha@example.com", "password": "secret123"})
    bodies = [{k: v for k, v in r.json()["error"].items() if k != "request_id"} for r in (unknown, wrong, google_only)]
    assert {r.status_code for r in (unknown, wrong, google_only)} == {401}
    assert bodies[0] == bodies[1] == bodies[2]


def test_refresh_token_cannot_be_used_as_access(client):
    tokens = register(client, mobile=True).json()
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['refresh_token']}"})
    assert r.status_code == 401


def test_logout_all_revokes_existing_tokens(client):
    tokens = register(client, mobile=True).json()
    h = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert client.post("/api/auth/logout-all", headers=h).status_code == 204
    assert client.get("/api/auth/me", headers=h).status_code == 401
    r = client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 401


def test_disabled_user_cannot_use_token(client, db_session):
    tokens = register(client, mobile=True).json()
    user = db_session.query(User).one()
    user.is_active = False
    db_session.commit()
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code == 401


def test_google_signin_reports_not_configured(client):
    r = client.post("/api/auth/google", json={"id_token": "x" * 40})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "google_signin_not_configured"


def test_google_signin_creates_and_links(client, db_session, monkeypatch):
    from app.api.routes import auth as auth_routes
    from app.services.firebase import FirebaseIdentity

    ident = FirebaseIdentity(uid="fb-123", email="ayesha@example.com", email_verified=True,
                             name="Ayesha", picture=None, sign_in_provider="google.com")
    monkeypatch.setattr(auth_routes, "verify_firebase_id_token", lambda _t: ident)

    register(client)  # existing password account with same email
    client.cookies.clear()
    r = client.post("/api/auth/google", json={"id_token": "x" * 40})
    assert r.status_code == 200
    assert db_session.query(User).count() == 1
    assert db_session.query(User).one().firebase_uid == "fb-123"

    ident2 = FirebaseIdentity(uid="fb-456", email="new@example.com", email_verified=True,
                              name="New Student", picture=None, sign_in_provider="google.com")
    monkeypatch.setattr(auth_routes, "verify_firebase_id_token", lambda _t: ident2)
    r = client.post("/api/auth/google", json={"id_token": "x" * 40})
    assert r.status_code == 200 and r.json()["user"]["role"] == "student"


def test_google_does_not_link_unverified_email(client, monkeypatch):
    from app.api.routes import auth as auth_routes
    from app.services.firebase import FirebaseIdentity

    register(client)
    client.cookies.clear()
    ident = FirebaseIdentity(uid="fb-x", email="ayesha@example.com", email_verified=False,
                             name=None, picture=None, sign_in_provider="google.com")
    monkeypatch.setattr(auth_routes, "verify_firebase_id_token", lambda _t: ident)
    r = client.post("/api/auth/google", json={"id_token": "x" * 40})
    assert r.status_code == 409


def test_google_rejects_non_google_firebase_provider(client, monkeypatch):
    from app.api.routes import auth as auth_routes
    from app.services.firebase import FirebaseIdentity

    ident = FirebaseIdentity(uid="fb-p", email="p@example.com", email_verified=True,
                             name=None, picture=None, sign_in_provider="password")
    monkeypatch.setattr(auth_routes, "verify_firebase_id_token", lambda _t: ident)
    assert client.post("/api/auth/google", json={"id_token": "x" * 40}).status_code == 401


def test_google_link_revokes_preexisting_password_and_sessions(client, db_session, monkeypatch):
    """Account pre-hijack: someone registers the victim's email with their own password first."""
    from app.api.routes import auth as auth_routes
    from app.services.firebase import FirebaseIdentity

    attacker = register(client, mobile=True).json()
    ident = FirebaseIdentity(uid="fb-v", email="ayesha@example.com", email_verified=True,
                             name="Ayesha", picture=None, sign_in_provider="google.com")
    monkeypatch.setattr(auth_routes, "verify_firebase_id_token", lambda _t: ident)
    client.cookies.clear()
    assert client.post("/api/auth/google", json={"id_token": "x" * 40}).status_code == 200
    client.cookies.clear()
    # The attacker's password and tokens no longer work.
    r = client.post("/api/auth/login", json={"email": "ayesha@example.com", "password": "secret123"})
    assert r.status_code == 401 and r.json()["error"]["code"] == "invalid_credentials"
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {attacker['access_token']}"}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": attacker["refresh_token"]}).status_code == 401


def test_cookie_refresh_never_returns_tokens_in_body(client):
    register(client)
    r = client.post("/api/auth/refresh", headers={"X-Client-Type": "mobile"})
    assert r.status_code == 200
    assert r.json().get("access_token") is None and r.json().get("refresh_token") is None


def test_auth_rate_limit(client):
    codes = [client.post("/api/auth/login", json={"email": "a@example.com", "password": "x"}).status_code for _ in range(12)]
    assert codes[-1] == 429
    assert 401 in codes


def test_forged_token_rejected(client):
    import jwt
    import uuid

    forged = jwt.encode({"sub": str(uuid.uuid4()), "typ": "access", "ver": 0, "exp": 9999999999, "role": "admin"},
                        "wrong-secret", algorithm="HS256")
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_token_for_admin_role_claim_is_not_trusted(client, db_session):
    """Role comes from the database, not the token claim."""
    register(client)
    user = db_session.query(User).one()
    token = create_token(user.id, Role.admin, user.token_version, "access")
    client.cookies.clear()
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.json()["role"] == "student"


def test_database_url_validation():
    import pytest
    from pydantic import ValidationError

    from app.core.config import Settings

    assert Settings(database_url="postgres://u:p@h:5432/db").database_url.startswith("postgresql+psycopg://")
    with pytest.raises(ValidationError):
        Settings(database_url="https://abcd.supabase.co")
