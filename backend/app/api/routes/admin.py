"""Admin: add, edit and verify opportunities. Every change is written to the audit log."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Query, Request, Response
from sqlalchemy import func, select

from app.core.deps import AdminUser, DbSession
from app.core.errors import ApiError
from app.core.rate_limit import client_ip
from app.models import AuditLog, Opportunity, SavedOpportunity, User
from app.models.enums import VerificationStatus
from app.schemas.opportunity import CATEGORY_LABELS, OpportunityAdminOut, OpportunityIn, OpportunityUpdate, VerifyIn
from app.services.opportunities import aware

router = APIRouter(prefix="/admin", tags=["admin"])


def _audit(db, request: Request, actor: User, action: str, o: Opportunity, details: dict | None = None) -> None:
    db.add(AuditLog(actor_id=actor.id, action=action, target_type="opportunity", target_id=str(o.id),
                    details=details or {}, ip=client_ip(request)))


def _out(db, o: Opportunity) -> OpportunityAdminOut:
    verifier = db.get(User, o.verified_by) if o.verified_by else None
    saved_count = db.scalar(select(func.count()).select_from(SavedOpportunity).where(SavedOpportunity.opportunity_id == o.id)) or 0
    return OpportunityAdminOut(
        id=str(o.id), title=o.title, description=o.description, category=o.category,
        category_label=CATEGORY_LABELS[o.category], provider=o.provider, eligibility=o.eligibility,
        education_levels=list(o.education_levels or []), deadline=aware(o.deadline),
        required_documents=list(o.required_documents or []), official_url=o.official_url,
        verification_status=o.verification_status, verified_by_name=verifier.full_name if verifier else None,
        verified_at=aware(o.verified_at), source_note=o.source_note, saved_count=saved_count,
        created_at=aware(o.created_at), updated_at=aware(o.updated_at),
    )


def _get(db, opportunity_id: uuid.UUID) -> Opportunity:
    o = db.get(Opportunity, opportunity_id)
    if not o:
        raise ApiError(404, "opportunity_not_found", "Opportunity not found.")
    return o


@router.get("/opportunities", response_model=list[OpportunityAdminOut])
def list_all(admin: AdminUser, db: DbSession, status: VerificationStatus | None = Query(default=None)):
    q = select(Opportunity).order_by(Opportunity.updated_at.desc())
    if status:
        q = q.where(Opportunity.verification_status == status)
    return [_out(db, o) for o in db.scalars(q).all()]


@router.post("/opportunities", response_model=OpportunityAdminOut, status_code=201)
def create(body: OpportunityIn, request: Request, admin: AdminUser, db: DbSession):
    data = body.model_dump()
    data["education_levels"] = [lv.value for lv in body.education_levels]
    o = Opportunity(**data, verification_status=VerificationStatus.unverified)
    db.add(o)
    db.flush()
    _audit(db, request, admin, "opportunity.create", o, {"title": o.title})
    db.commit()
    return _out(db, o)


@router.get("/opportunities/{opportunity_id}", response_model=OpportunityAdminOut)
def get_one(opportunity_id: uuid.UUID, admin: AdminUser, db: DbSession):
    return _out(db, _get(db, opportunity_id))


@router.patch("/opportunities/{opportunity_id}", response_model=OpportunityAdminOut)
def update(opportunity_id: uuid.UUID, body: OpportunityUpdate, request: Request, admin: AdminUser, db: DbSession):
    o = _get(db, opportunity_id)
    data = body.model_dump(exclude_unset=True)
    for required in ("title", "description", "category", "provider", "eligibility", "official_url"):
        if required in data and data[required] is None:
            raise ApiError(422, "validation_error", f"{required.replace('_', ' ').capitalize()} cannot be empty.")
    if "education_levels" in data:
        data["education_levels"] = [lv.value for lv in (body.education_levels or [])]
    if "required_documents" in data and data["required_documents"] is None:
        data["required_documents"] = []
    current = lambda k: aware(getattr(o, k)) if k == "deadline" else getattr(o, k)  # noqa: E731
    changed = {k: v for k, v in data.items() if current(k) != v}
    if not changed:
        return _out(db, o)
    for k, v in changed.items():
        setattr(o, k, v)
    was_verified = o.verification_status == VerificationStatus.verified
    if was_verified:
        # Verified details changed: students stop seeing it until someone re-checks the official source.
        o.verification_status = VerificationStatus.unverified
        o.verified_by = None
        o.verified_at = None
    _audit(db, request, admin, "opportunity.update", o, {"fields": sorted(changed), "unverified": was_verified})
    db.commit()
    return _out(db, o)


@router.post("/opportunities/{opportunity_id}/verify", response_model=OpportunityAdminOut)
def verify(opportunity_id: uuid.UUID, body: VerifyIn, request: Request, admin: AdminUser, db: DbSession):
    o = _get(db, opportunity_id)
    if body.status == "verified":
        o.verification_status = VerificationStatus.verified
        o.verified_by = admin.id
        o.verified_at = datetime.now(UTC)
    else:
        o.verification_status = VerificationStatus.rejected
        o.verified_by = None
        o.verified_at = None
    if body.source_note:
        o.source_note = body.source_note
    _audit(db, request, admin, f"opportunity.{body.status}", o, {"source_note": body.source_note})
    db.commit()
    return _out(db, o)


@router.delete("/opportunities/{opportunity_id}", status_code=204, response_class=Response)
def remove(opportunity_id: uuid.UUID, request: Request, admin: AdminUser, db: DbSession):
    o = _get(db, opportunity_id)
    _audit(db, request, admin, "opportunity.delete", o, {"title": o.title})
    db.delete(o)
    db.commit()
    return Response(status_code=204)
