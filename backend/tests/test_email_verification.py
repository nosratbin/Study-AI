from app.core.deps import ACCESS_COOKIE
from app.models import EmailVerification, User
from app.services.email import OUTBOX

from .conftest import last_code, register, register_unverified

EMAIL = "ayesha@example.com"


def _link_token() -> str:
    mail = next(m for m in reversed(OUTBOX) if m.to == EMAIL)
    return mail.text.split("#token=", 1)[1].split()[0]


def test_register_sends_code_and_link_but_no_session(client, db_session):
    r = register_unverified(client)
    assert r.status_code == 201
    assert r.json() == {"email": EMAIL, "resend_after": 60}
    assert not any(ACCESS_COOKIE in c for c in r.headers.get_list("set-cookie"))
    assert client.get("/api/auth/me").status_code == 401
    mail = OUTBOX[-1]
    code = last_code(EMAIL)
    assert len(code) == 6 and code.isdigit() and code in mail.text and code in mail.html
    assert "/verify-email#token=" in mail.text
    row = db_session.query(EmailVerification).one()
    assert code not in row.code_hash and _link_token() not in row.token_hash  # only hashes are stored


def test_code_signs_in_once(client):
    register_unverified(client)
    code = last_code(EMAIL)
    r = client.post("/api/auth/verify-email", json={"email": EMAIL, "code": code})
    assert r.status_code == 200 and r.json()["user"]["email"] == EMAIL
    assert client.get("/api/auth/me").status_code == 200
    assert client.post("/api/auth/verify-email", json={"email": EMAIL, "code": code}).status_code == 400


def test_link_signs_in(client):
    register_unverified(client)
    r = client.post("/api/auth/verify-email/link", json={"token": _link_token()})
    assert r.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_wrong_codes_lock_after_five(client):
    register_unverified(client)
    code = last_code(EMAIL)
    wrong = "000000" if code != "000000" else "111111"
    codes = [client.post("/api/auth/verify-email", json={"email": EMAIL, "code": wrong}).json()["error"]["code"] for _ in range(5)]
    assert codes[:4] == ["invalid_code"] * 4 and codes[4] == "too_many_attempts"
    r = client.post("/api/auth/verify-email", json={"email": EMAIL, "code": code})
    assert r.status_code == 429  # even the right code is refused until a new one is sent


def test_login_before_verifying_sends_new_code(client, db_session):
    register_unverified(client)
    first = last_code(EMAIL)
    row = db_session.query(EmailVerification).one()
    from datetime import timedelta

    row.created_at = row.created_at - timedelta(minutes=2)  # past the resend cooldown
    db_session.commit()
    r = client.post("/api/auth/login", json={"email": EMAIL, "password": "secret123"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "email_unverified"
    assert r.json()["error"]["details"][0]["email"] == EMAIL
    assert len(OUTBOX) == 2 and last_code(EMAIL) != first
    # A wrong password still gets the generic answer, so this can't be used to find accounts.
    bad = client.post("/api/auth/login", json={"email": EMAIL, "password": "wrong123"})
    assert bad.status_code == 401


def test_resend_has_cooldown_and_does_not_reveal_accounts(client):
    register_unverified(client)
    assert len(OUTBOX) == 1
    r = client.post("/api/auth/verify-email/resend", json={"email": EMAIL})
    assert r.status_code == 202 and 0 < r.json()["resend_after"] <= 60
    assert len(OUTBOX) == 1  # too soon, nothing sent
    other = client.post("/api/auth/verify-email/resend", json={"email": "nobody@example.com"})
    assert other.status_code == 202 and len(OUTBOX) == 1


def test_unverified_signup_can_be_claimed_by_the_real_owner(client, db_session):
    register_unverified(client, password="attacker1")
    r = register(client, password="owner1234", name="Real Owner")
    assert r.status_code == 200
    assert db_session.query(User).count() == 1 and db_session.query(User).one().full_name == "Real Owner"
    client.cookies.clear()
    assert client.post("/api/auth/login", json={"email": EMAIL, "password": "attacker1"}).status_code == 401


def test_verified_email_cannot_be_registered_again(client):
    register(client)
    r = register_unverified(client)
    assert r.status_code == 409 and r.json()["error"]["code"] == "email_taken"


def test_plus_alias_rejected(client):
    r = register_unverified(client, email="ayesha+school@example.com")
    assert r.status_code == 422
    assert r.json()["error"]["details"][0]["field"] == "email"


def test_google_new_account_is_verified_and_alias_rejected(client, monkeypatch):
    from app.api.routes import auth as auth_routes
    from app.services.firebase import FirebaseIdentity

    ident = FirebaseIdentity(uid="fb-1", email="new@example.com", email_verified=True, name="New", picture=None,
                             sign_in_provider="google.com")
    monkeypatch.setattr(auth_routes, "verify_firebase_id_token", lambda _t: ident)
    assert client.post("/api/auth/google", json={"id_token": "x" * 40}).status_code == 200
    alias = FirebaseIdentity(uid="fb-2", email="new+x@example.com", email_verified=True, name="New", picture=None,
                             sign_in_provider="google.com")
    monkeypatch.setattr(auth_routes, "verify_firebase_id_token", lambda _t: alias)
    r = client.post("/api/auth/google", json={"id_token": "x" * 40})
    assert r.status_code == 400 and r.json()["error"]["code"] == "email_alias"


def test_production_without_smtp_refuses_password_signup(client, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "environment", "production")
    r = register_unverified(client)
    assert r.status_code == 503 and r.json()["error"]["code"] == "email_not_configured"
    assert client.get("/api/health").json()["integrations"]["email"] is False
