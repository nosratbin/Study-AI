"""Skill Passport: the student's own view, self-reported achievements, share links and public pages."""

import secrets
import uuid
from datetime import UTC, date, datetime, time

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select

from app.core.deps import DbSession, StudentUser
from app.core.errors import ApiError
from app.core.rate_limit import rate_limit
from app.models import Certificate, Course, SkillRecord, StudentProfile, User
from app.models.enums import VerificationStatus
from app.schemas.growth import (
    CertificateCheckOut,
    PassportOut,
    PublicPassportOut,
    ShareIn,
    ShareState,
    SkillRecordIn,
    SkillRecordOut,
    SkillRecordUpdate,
)
from app.services.opportunities import aware
from app.services.passport import build_passport, display_name, public_passport, record_out

router = APIRouter(prefix="/skills", tags=["skill passport"])
public_router = APIRouter(prefix="/public", tags=["public"])

MAX_RECORDS = 200
CONTENT_FIELDS = {"title", "description", "evidence_url", "issued_by", "achieved_on"}
NULLABLE_FIELDS = {"description", "evidence_url", "issued_by", "achieved_on"}


def _as_dt(d: date | None) -> datetime | None:
    return datetime.combine(d, time(12), tzinfo=UTC) if d else None  # noon UTC: the same calendar day in Dhaka


def _own_record(db, user: User, record_id: uuid.UUID) -> SkillRecord:
    r = db.get(SkillRecord, record_id)
    if not r or r.user_id != user.id:
        raise ApiError(404, "record_not_found", "Achievement not found.")
    return r


@router.get("/passport", response_model=PassportOut)
def passport(user: StudentUser, db: DbSession):
    return build_passport(db, user)


@router.post("/records", response_model=SkillRecordOut, status_code=201)
def add_record(body: SkillRecordIn, user: StudentUser, db: DbSession):
    count = db.query(SkillRecord).filter(SkillRecord.user_id == user.id).count()
    if count >= MAX_RECORDS:
        raise ApiError(409, "too_many_records", "You've reached the limit of achievements. Remove an old one first.")
    data = body.model_dump()
    data["achieved_on"] = _as_dt(body.achieved_on)
    r = SkillRecord(user_id=user.id, verification_status=VerificationStatus.unverified, **data)
    db.add(r)
    db.commit()
    return record_out(r)


@router.patch("/records/{record_id}", response_model=SkillRecordOut)
def edit_record(record_id: uuid.UUID, body: SkillRecordUpdate, user: StudentUser, db: DbSession):
    r = _own_record(db, user, record_id)
    # null clears an optional field; for required fields (title, is_public) it means "no change".
    changes = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None or k in NULLABLE_FIELDS}
    if "achieved_on" in changes:
        changes["achieved_on"] = _as_dt(changes["achieved_on"])
    current = lambda k: aware(getattr(r, k)) if k == "achieved_on" else getattr(r, k)  # noqa: E731
    content_changed = any(k in CONTENT_FIELDS and current(k) != v for k, v in changes.items())
    for k, v in changes.items():
        setattr(r, k, v)
    if content_changed and r.verification_status != VerificationStatus.unverified:
        # A verified badge only covers what the reviewer saw.
        r.verification_status, r.verified_by, r.verified_at, r.review_note = VerificationStatus.unverified, None, None, None
    db.commit()
    return record_out(r)


@router.delete("/records/{record_id}", status_code=204)
def delete_record(record_id: uuid.UUID, user: StudentUser, db: DbSession):
    db.delete(_own_record(db, user, record_id))
    db.commit()
    return Response(status_code=204)


@router.put("/passport/share", response_model=ShareState)
def set_share(body: ShareIn, user: StudentUser, db: DbSession):
    profile: StudentProfile | None = user.student_profile
    if not profile or not profile.onboarding_completed:
        raise ApiError(409, "onboarding_required", "Finish setting up your profile first.")
    if body.enabled:
        if profile.is_minor and not profile.guardian_consent_at:
            raise ApiError(403, "guardian_consent_required", "A parent or guardian needs to agree before you share your passport.")
        if not profile.passport_token:
            profile.passport_token = secrets.token_urlsafe(24)
            profile.passport_shared_at = datetime.now(UTC)
    else:
        profile.passport_token, profile.passport_shared_at = None, None
    db.commit()
    return ShareState(enabled=bool(profile.passport_token), token=profile.passport_token, shared_at=aware(profile.passport_shared_at))


@router.post("/passport/share/rotate", response_model=ShareState)
def rotate_share(user: StudentUser, db: DbSession):
    """New link; the old one stops working immediately."""
    profile = user.student_profile
    if not profile or not profile.passport_token:
        raise ApiError(409, "not_shared", "Turn on sharing first.")
    profile.passport_token = secrets.token_urlsafe(24)
    profile.passport_shared_at = datetime.now(UTC)
    db.commit()
    return ShareState(enabled=True, token=profile.passport_token, shared_at=aware(profile.passport_shared_at))


# ---------- public (no login) ----------

public_limit = Depends(rate_limit("public_passport", 60))


@public_router.get("/passport/{token}", response_model=PublicPassportOut, dependencies=[public_limit])
def view_shared(token: str, db: DbSession):
    if not (16 <= len(token) <= 64):
        raise ApiError(404, "passport_not_found", "This passport link is not active.")
    profile = db.scalar(select(StudentProfile).where(StudentProfile.passport_token == token))
    if not profile or not profile.user.is_active:
        raise ApiError(404, "passport_not_found", "This passport link is not active.")
    return public_passport(db, profile.user)


@public_router.get("/certificates/{code}", response_model=CertificateCheckOut, dependencies=[public_limit])
def check_certificate(code: str, db: DbSession):
    code = code.strip().upper()[:40]
    cert = db.scalar(select(Certificate).where(Certificate.certificate_code == code))
    if not cert:
        return CertificateCheckOut(valid=False, code=code)
    holder = db.get(User, cert.user_id)
    course = db.get(Course, cert.course_id) if cert.course_id else None
    return CertificateCheckOut(valid=True, code=code, title=cert.title, holder=display_name(holder) if holder else None,
                               issued_at=aware(cert.issued_at), is_demo=bool(course and course.is_demo))
