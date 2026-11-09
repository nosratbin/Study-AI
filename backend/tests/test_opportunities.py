from datetime import UTC, datetime, timedelta

from app.core.security import create_token, hash_password
from app.models import AuditLog, Opportunity, Role, User

from .conftest import ONBOARDING, register

FUTURE = (datetime.now(UTC) + timedelta(days=20)).replace(microsecond=0).isoformat()
FAR = (datetime.now(UTC) + timedelta(days=120)).replace(microsecond=0).isoformat()

# Test fixtures only (example.org): never real scholarships.
BODY = {
    "title": "Test Merit Scholarship",
    "description": "A test scholarship used only by the automated test suite.",
    "category": "merit_scholarship",
    "provider": "Test Foundation",
    "eligibility": "College students with good results.",
    "education_levels": ["college"],
    "deadline": FUTURE,
    "required_documents": ["Transcript", "NID copy"],
    "official_url": "https://www.example.org/scholarship",
}


def admin_headers(db_session) -> dict:
    a = User(email="admin@example.com", full_name="Admin", role=Role.admin, password_hash=hash_password("secret123"))
    db_session.add(a)
    db_session.commit()
    return {"Authorization": f"Bearer {create_token(a.id, a.role, 0, 'access')}"}


def create(client, h, **overrides) -> dict:
    r = client.post("/api/admin/opportunities", json={**BODY, **overrides}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


def verify(client, h, oid: str):
    r = client.post(f"/api/admin/opportunities/{oid}/verify", json={"status": "verified", "source_note": "Checked the official page on 10 Nov"}, headers=h)
    assert r.status_code == 200, r.text
    return r.json()


def student(client):
    register(client)
    client.post("/api/students/onboarding", json=ONBOARDING)


def test_only_verified_opportunities_reach_students(client, db_session):
    h = admin_headers(db_session)
    o = create(client, h)
    assert o["verification_status"] == "unverified"
    student(client)
    assert client.get("/api/opportunities").json() == []
    assert client.get(f"/api/opportunities/{o['id']}").status_code == 404
    assert client.post(f"/api/opportunities/{o['id']}/save").status_code == 404
    verify(client, h, o["id"])
    items = client.get("/api/opportunities").json()
    assert [i["id"] for i in items] == [o["id"]]
    assert items[0]["days_left"] in (19, 20) and items[0]["is_closed"] is False
    assert "source_note" not in items[0] and "verification_status" not in items[0]


def test_editing_a_verified_opportunity_hides_it_until_reverified(client, db_session):
    h = admin_headers(db_session)
    o = create(client, h)
    verify(client, h, o["id"])
    r = client.patch(f"/api/admin/opportunities/{o['id']}", json={"deadline": FAR}, headers=h)
    assert r.json()["verification_status"] == "unverified" and r.json()["verified_by_name"] is None
    student(client)
    assert client.get("/api/opportunities").json() == []
    actions = [a.action for a in db_session.query(AuditLog).order_by(AuditLog.created_at)]
    assert actions == ["opportunity.create", "opportunity.verified", "opportunity.update"]


def test_verification_needs_a_source_note_and_https_url(client, db_session):
    h = admin_headers(db_session)
    o = create(client, h)
    r = client.post(f"/api/admin/opportunities/{o['id']}/verify", json={"status": "verified"}, headers=h)
    assert r.status_code == 422
    for bad in ("http://example.org/x", "javascript:alert(1)", "https://user@evil.example/x", "example.org"):
        assert client.post("/api/admin/opportunities", json={**BODY, "official_url": bad}, headers=h).status_code == 422
    naive = client.post("/api/admin/opportunities", json={**BODY, "deadline": "2030-01-01T00:00:00"}, headers=h)
    assert naive.status_code == 422


def test_admin_routes_forbidden_for_students(client):
    student(client)
    assert client.get("/api/admin/opportunities").status_code == 403
    assert client.post("/api/admin/opportunities", json=BODY).status_code == 403


def test_closed_and_ineligible_are_filtered(client, db_session):
    h = admin_headers(db_session)
    past = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    closed = create(client, h, title="Closed Test Award", deadline=past)
    school = create(client, h, title="School Only Test Award", education_levels=["school"])
    rolling = create(client, h, title="Rolling Test Programme", deadline=None, education_levels=[])
    for o in (closed, school, rolling):
        verify(client, h, o["id"])
    student(client)  # college
    titles = {o["title"] for o in client.get("/api/opportunities").json()}
    assert titles == {"School Only Test Award", "Rolling Test Programme"}
    assert {o["title"] for o in client.get("/api/opportunities?level=college").json()} == {"Rolling Test Programme"}
    assert "Closed Test Award" in {o["title"] for o in client.get("/api/opportunities?include_closed=true").json()}
    matched = {m["opportunity"]["title"] for m in client.get("/api/opportunities/match").json()}
    assert matched == {"Rolling Test Programme"}


def test_matcher_ranks_by_level_and_interest_with_reasons(client, db_session):
    h = admin_headers(db_session)
    a = create(client, h, title="College Test Hackathon", category="hackathon")
    b = create(client, h, title="Test Sports Meet", category="sports", education_levels=[])
    for o in (a, b):
        verify(client, h, o["id"])
    student(client)  # college, interests include Python
    m = client.get("/api/opportunities/match").json()
    assert m[0]["opportunity"]["title"] == "College Test Hackathon"
    assert m[0]["score"] > m[1]["score"]
    assert any("college" in r for r in m[0]["reasons"]) and any("Python" in r for r in m[0]["reasons"])


def test_save_and_track_application(client, db_session):
    h = admin_headers(db_session)
    o = create(client, h)
    verify(client, h, o["id"])
    student(client)
    assert client.post(f"/api/opportunities/{o['id']}/save").json()["saved"] is True
    assert client.post(f"/api/opportunities/{o['id']}/save").status_code == 200  # idempotent
    assert len(client.get("/api/opportunities/saved").json()) == 1
    dash = client.get("/api/students/dashboard").json()
    assert any(d.get("title") == BODY["title"] for d in dash.get("upcoming_deadlines", []))

    r = client.put(f"/api/opportunities/{o['id']}/application", json={"status": "applied", "notes": "Sent by post"})
    assert r.status_code == 200 and r.json()["applied_at"] is not None
    tracked = client.get("/api/opportunities/applications").json()
    assert tracked[0]["application"]["status"] == "applied"
    assert client.put(f"/api/opportunities/{o['id']}/application", json={"status": "bogus"}).status_code == 422

    assert client.delete(f"/api/opportunities/{o['id']}/save").json()["saved"] is False
    assert client.delete(f"/api/opportunities/{o['id']}/application").status_code == 204
    assert client.get("/api/opportunities/applications").json() == []


def test_students_cannot_see_each_others_saves(client, db_session):
    h = admin_headers(db_session)
    o = create(client, h)
    verify(client, h, o["id"])
    student(client)
    client.post(f"/api/opportunities/{o['id']}/save")
    client.cookies.clear()
    register(client, email="b@example.com")
    assert client.get("/api/opportunities/saved").json() == []
    assert client.get(f"/api/opportunities/{o['id']}").json()["saved"] is False


def test_nothing_is_seeded(db_session):
    """Product rule: never seed or invent scholarships, deadlines or links."""
    from app import seed

    src = open(seed.__file__, encoding="utf-8").read()
    assert "Opportunity(" not in src
    assert db_session.query(Opportunity).count() == 0
