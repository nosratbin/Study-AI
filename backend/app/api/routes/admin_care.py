"""Admin: verify students' achievements, manage the MindCare support directory, handle support requests.

Every action is written to the audit log, including each time staff open the support-request inbox.
Mood check-ins are never exposed here.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Query, Request, Response
from sqlalchemy import select

from app.core.crypto import unseal
from app.core.deps import AdminUser, DbSession
from app.core.errors import ApiError
from app.core.rate_limit import client_ip
from app.models import AuditLog, SkillRecord, SupportRequest, SupportResource, User
from app.models.enums import SupportRequestStatus, VerificationStatus
from app.schemas.growth import (
    ResourceVerifyIn,
    SkillRecordAdminOut,
    SkillVerifyIn,
    SupportRequestAdminOut,
    SupportResourceAdminOut,
    SupportResourceIn,
    SupportStatusIn,
)
from app.services.notify import notify
from app.services.opportunities import aware
from app.services.passport import record_out

router = APIRouter(prefix="/admin", tags=["admin"])


def _audit(db, request: Request, actor: User, action: str, target_type: str, target_id: str | None, details: dict | None = None):
    db.add(AuditLog(actor_id=actor.id, action=action, target_type=target_type, target_id=target_id,
                    details=details or {}, ip=client_ip(request)))


# ---------- achievements ----------


@router.get("/skill-records", response_model=list[SkillRecordAdminOut])
def skill_records(admin: AdminUser, db: DbSession, status: VerificationStatus = Query(default=VerificationStatus.unverified)):
    rows = db.execute(select(SkillRecord, User.full_name).join(User, User.id == SkillRecord.user_id)
                      .where(SkillRecord.verification_status == status).order_by(SkillRecord.updated_at).limit(200)).all()
    return [SkillRecordAdminOut(**record_out(r).model_dump(), owner_name=name, review_note=r.review_note) for r, name in rows]


@router.post("/skill-records/{record_id}/verify", response_model=SkillRecordAdminOut)
def verify_record(record_id: uuid.UUID, body: SkillVerifyIn, request: Request, admin: AdminUser, db: DbSession):
    r = db.get(SkillRecord, record_id)
    if not r:
        raise ApiError(404, "record_not_found", "Achievement not found.")
    if r.user_id == admin.id:
        raise ApiError(403, "forbidden", "You can't verify your own achievement.")
    verified = body.status == "verified"
    r.verification_status = VerificationStatus.verified if verified else VerificationStatus.rejected
    r.verified_by, r.verified_at = (admin.id, datetime.now(UTC)) if verified else (None, None)
    r.review_note = body.review_note
    _audit(db, request, admin, f"skill_record.{body.status}", "skill_record", str(r.id), {"review_note": body.review_note})
    notify(db, r.user_id, f"Achievement {'verified' if verified else 'not verified'}: {r.title}",
           "It now shows as verified on your Skill Passport." if verified else "See the reviewer's note on your Skill Passport.",
           kind="achievement", link="/passport")
    db.commit()
    owner = db.get(User, r.user_id)
    return SkillRecordAdminOut(**record_out(r).model_dump(), owner_name=owner.full_name, review_note=r.review_note)


# ---------- support directory ----------


def _resource_out(db, r: SupportResource) -> SupportResourceAdminOut:
    verifier = db.get(User, r.verified_by) if r.verified_by else None
    return SupportResourceAdminOut(
        id=str(r.id), name=r.name, kind=r.kind, description=r.description, phone=r.phone, url=r.url, hours=r.hours,
        languages=list(r.languages or []), cost_note=r.cost_note, verification_status=r.verification_status,
        verified_by_name=verifier.full_name if verifier else None, verified_at=aware(r.verified_at), source_note=r.source_note,
    )


def _resource(db, resource_id: uuid.UUID) -> SupportResource:
    r = db.get(SupportResource, resource_id)
    if not r:
        raise ApiError(404, "resource_not_found", "Support resource not found.")
    return r


@router.get("/support-resources", response_model=list[SupportResourceAdminOut])
def list_resources(admin: AdminUser, db: DbSession):
    return [_resource_out(db, r) for r in db.scalars(select(SupportResource).order_by(SupportResource.updated_at.desc())).all()]


@router.post("/support-resources", response_model=SupportResourceAdminOut, status_code=201)
def add_resource(body: SupportResourceIn, request: Request, admin: AdminUser, db: DbSession):
    r = SupportResource(**body.model_dump(), verification_status=VerificationStatus.unverified)
    db.add(r)
    db.flush()
    _audit(db, request, admin, "support_resource.create", "support_resource", str(r.id), {"name": r.name})
    db.commit()
    return _resource_out(db, r)


@router.put("/support-resources/{resource_id}", response_model=SupportResourceAdminOut)
def edit_resource(resource_id: uuid.UUID, body: SupportResourceIn, request: Request, admin: AdminUser, db: DbSession):
    r = _resource(db, resource_id)
    changed = sorted(k for k, v in body.model_dump().items() if getattr(r, k) != v)
    if not changed:
        return _resource_out(db, r)
    for k, v in body.model_dump().items():
        setattr(r, k, v)
    # Contact details changed: students stop seeing it until someone re-checks.
    r.verification_status, r.verified_by, r.verified_at = VerificationStatus.unverified, None, None
    _audit(db, request, admin, "support_resource.update", "support_resource", str(r.id), {"fields": changed})
    db.commit()
    return _resource_out(db, r)


@router.post("/support-resources/{resource_id}/verify", response_model=SupportResourceAdminOut)
def verify_resource(resource_id: uuid.UUID, body: ResourceVerifyIn, request: Request, admin: AdminUser, db: DbSession):
    r = _resource(db, resource_id)
    verified = body.status == "verified"
    r.verification_status = VerificationStatus.verified if verified else VerificationStatus.rejected
    r.verified_by, r.verified_at = (admin.id, datetime.now(UTC)) if verified else (None, None)
    r.source_note = body.source_note
    _audit(db, request, admin, f"support_resource.{body.status}", "support_resource", str(r.id), {"source_note": body.source_note})
    db.commit()
    return _resource_out(db, r)


@router.delete("/support-resources/{resource_id}", status_code=204, response_class=Response)
def delete_resource(resource_id: uuid.UUID, request: Request, admin: AdminUser, db: DbSession):
    r = _resource(db, resource_id)
    _audit(db, request, admin, "support_resource.delete", "support_resource", str(r.id), {"name": r.name})
    db.delete(r)
    db.commit()
    return Response(status_code=204)


# ---------- support requests ----------


def _request_out(r: SupportRequest, u: User) -> SupportRequestAdminOut:
    return SupportRequestAdminOut(
        id=str(r.id), topic=r.topic, message=unseal(r.message_enc), preferred_contact=r.preferred_contact, status=r.status,
        created_at=aware(r.created_at), handled_at=aware(r.handled_at), student_name=u.full_name, student_email=u.email,
        phone=unseal(r.phone_enc), is_minor=bool(u.student_profile and u.student_profile.is_minor),
    )


@router.get("/support-requests", response_model=list[SupportRequestAdminOut])
def support_requests(request: Request, admin: AdminUser, db: DbSession, include_closed: bool = Query(default=False)):
    q = select(SupportRequest, User).join(User, User.id == SupportRequest.user_id).order_by(SupportRequest.created_at)
    if not include_closed:
        q = q.where(SupportRequest.status != SupportRequestStatus.closed)
    rows = db.execute(q.limit(200)).all()
    _audit(db, request, admin, "support_request.view_inbox", "support_request", None, {"count": len(rows)})
    db.commit()
    return [_request_out(r, u) for r, u in rows]


@router.patch("/support-requests/{request_id}", response_model=SupportRequestAdminOut)
def set_request_status(request_id: uuid.UUID, body: SupportStatusIn, request: Request, admin: AdminUser, db: DbSession):
    r = db.get(SupportRequest, request_id)
    if not r:
        raise ApiError(404, "request_not_found", "Support request not found.")
    r.status, r.handled_by, r.handled_at = body.status, admin.id, datetime.now(UTC)
    _audit(db, request, admin, f"support_request.{body.status}", "support_request", str(r.id))
    db.commit()
    return _request_out(r, db.get(User, r.user_id))
