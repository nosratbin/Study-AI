from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.core.config import get_settings
from app.core.deps import DbSession
from app.core.rate_limit import rate_limit
from app.models import ContactMessage
from app.schemas.student import ContactIn

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
        "integrations": {"google_signin": s.firebase_enabled, "gemini": s.ai_enabled, "google_workspace": False},
    }


@router.post("/contact", status_code=201, dependencies=[Depends(rate_limit("contact", 5, 600))])
def contact(body: ContactIn, db: DbSession):
    db.add(ContactMessage(**body.model_dump()))
    db.commit()
    return {"ok": True}
