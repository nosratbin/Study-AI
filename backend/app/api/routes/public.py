from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import text

from app.core.config import get_settings
from app.core.deps import DbSession
from app.core.rate_limit import rate_limit
from app.models import ContactMessage
from app.schemas.student import ContactIn
from app.services import edu_directory

router = APIRouter(tags=["public"])


@router.get("/health")
def health(db: DbSession):
    s = get_settings()
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "database_engine": db.get_bind().dialect.name,
        "integrations": {"google_signin": s.firebase_enabled, "gemini": s.ai_enabled, "groq": bool(s.groq_api_key), "zai": bool(s.zai_api_key), "google_workspace": s.google_enabled, "email": s.email_enabled},
    }


@router.post("/contact", status_code=201, dependencies=[Depends(rate_limit("contact", 5, 600))])
def contact(body: ContactIn, db: DbSession):
    db.add(ContactMessage(**body.model_dump()))
    db.commit()
    return {"ok": True}


# Onboarding and settings suggestions. Public and cheap (in-memory lists), so the Expo app can use them before sign-in too.
@router.get("/meta/institutions", dependencies=[Depends(rate_limit("meta", 120, 60))])
def institutions(
    q: Annotated[str, Query(max_length=100)] = "",
    level: Literal["school", "college", "university"] | None = None,
    limit: Annotated[int, Query(ge=1, le=20)] = 8,
):
    return {"items": edu_directory.search_institutions(q, level, limit)}


@router.get("/meta/districts")
def districts(response: Response):
    response.headers["Cache-Control"] = "public, max-age=86400"
    return {"items": edu_directory.districts()}
