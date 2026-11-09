import os

# Must be set before app modules import settings.
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "test-secret-" + "x" * 40
os.environ["FIREBASE_PROJECT_ID"] = ""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.rate_limit import limiter
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session):
    def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db
    limiter.reset()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def register(client, email="ayesha@example.com", password="secret123", name="Ayesha Rahman", mobile=False):
    headers = {"X-Client-Type": "mobile"} if mobile else {}
    return client.post("/api/auth/register", json={"full_name": name, "email": email, "password": password}, headers=headers)


ONBOARDING = {
    "education_level": "college",
    "institution": "Dhaka College",
    "class_or_year": "HSC 2nd year",
    "district": "Dhaka",
    "birth_year": 2000,
    "preferred_language": "bn",
    "interests": ["Python", "AI", "python"],
}
