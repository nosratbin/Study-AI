"""MindCare: private mood check-ins and journal, verified support directory, and requests for human support.

Safety rules: no diagnosis, no AI on well-being data, no scores. Journal notes and support messages are
encrypted at rest. Only the student can read their check-ins: there is no staff endpoint for them, and
dashboard/academic code never imports these tables.
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Query, Response
from sqlalchemy import delete, select

from app.core.crypto import seal, unseal
from app.core.deps import DbSession, StudentUser
from app.core.errors import ApiError
from app.core.rate_limit import limiter
from app.models import MoodCheckin, SupportRequest, SupportResource
from app.models.enums import SupportRequestStatus, VerificationStatus
from app.schemas.growth import (
    CheckinCreated,
    CheckinIn,
    CheckinOut,
    SupportRequestIn,
    SupportRequestOut,
    SupportResourceOut,
)
from app.services.opportunities import aware

router = APIRouter(prefix="/mindcare", tags=["mindcare"])

# Bangladesh's national emergency number (police, fire, ambulance). The only hard-coded contact: every
# other helpline or counsellor is added and verified by an admin before students see it.
EMERGENCY = {"number": "999", "label": "National Emergency Service (Bangladesh)"}
LOW_MOOD = 2
MAX_OPEN_REQUESTS = 3


def checkin_out(c: MoodCheckin) -> CheckinOut:
    return CheckinOut(id=str(c.id), mood=c.mood, note=unseal(c.note), tags=list(c.tags or []), created_at=aware(c.created_at))


def resource_out(r: SupportResource) -> SupportResourceOut:
    return SupportResourceOut(id=str(r.id), name=r.name, kind=r.kind, description=r.description, phone=r.phone, url=r.url,
                              hours=r.hours, languages=list(r.languages or []), cost_note=r.cost_note)


def request_out(r: SupportRequest) -> SupportRequestOut:
    return SupportRequestOut(id=str(r.id), topic=r.topic, message=unseal(r.message_enc), preferred_contact=r.preferred_contact,
                             status=r.status, created_at=aware(r.created_at), handled_at=aware(r.handled_at))


@router.post("/checkin", response_model=CheckinCreated, status_code=201)
def checkin(body: CheckinIn, user: StudentUser, db: DbSession):
    if limiter.hit(f"mindcare:{user.id}", 20, 3600) is not None:
        raise ApiError(429, "rate_limited", "You've checked in a lot this hour. Take a breather and come back later.")
    c = MoodCheckin(user_id=user.id, mood=body.mood, note=seal(body.note), tags=list(dict.fromkeys(body.tags)))
    db.add(c)
    db.commit()
    return CheckinCreated(**checkin_out(c).model_dump(), show_support=body.mood <= LOW_MOOD)


@router.get("/checkins", response_model=list[CheckinOut])
def checkins(user: StudentUser, db: DbSession, days: int = Query(default=30, ge=1, le=365)):
    since = datetime.now(UTC) - timedelta(days=days)
    rows = db.scalars(select(MoodCheckin).where(MoodCheckin.user_id == user.id, MoodCheckin.created_at >= since)
                      .order_by(MoodCheckin.created_at.desc()).limit(500)).all()
    return [checkin_out(c) for c in rows]


@router.delete("/checkins/{checkin_id}", status_code=204)
def delete_checkin(checkin_id: uuid.UUID, user: StudentUser, db: DbSession):
    c = db.get(MoodCheckin, checkin_id)
    if not c or c.user_id != user.id:
        raise ApiError(404, "checkin_not_found", "Check-in not found.")
    db.delete(c)
    db.commit()
    return Response(status_code=204)


@router.delete("/checkins", status_code=204)
def erase_journal(user: StudentUser, db: DbSession):
    """Permanently delete every check-in and journal note."""
    db.execute(delete(MoodCheckin).where(MoodCheckin.user_id == user.id))
    db.commit()
    return Response(status_code=204)


@router.get("/resources")
def resources(user: StudentUser, db: DbSession) -> dict:
    rows = db.scalars(select(SupportResource).where(SupportResource.verification_status == VerificationStatus.verified)
                      .order_by(SupportResource.kind, SupportResource.name)).all()
    return {"emergency": EMERGENCY, "resources": [resource_out(r).model_dump() for r in rows]}


@router.post("/support-requests", response_model=SupportRequestOut, status_code=201)
def request_support(body: SupportRequestIn, user: StudentUser, db: DbSession):
    open_count = db.query(SupportRequest).filter(SupportRequest.user_id == user.id,
                                                 SupportRequest.status != SupportRequestStatus.closed).count()
    if open_count >= MAX_OPEN_REQUESTS:
        raise ApiError(409, "too_many_open_requests",
                       f"You already have open requests. Our team will reach you soon. In an emergency call {EMERGENCY['number']}.")
    r = SupportRequest(user_id=user.id, topic=body.topic, message_enc=seal(body.message), preferred_contact=body.preferred_contact,
                       phone_enc=seal(body.phone), status=SupportRequestStatus.open)
    db.add(r)
    db.commit()
    return request_out(r)


@router.get("/support-requests", response_model=list[SupportRequestOut])
def my_requests(user: StudentUser, db: DbSession):
    rows = db.scalars(select(SupportRequest).where(SupportRequest.user_id == user.id).order_by(SupportRequest.created_at.desc())).all()
    return [request_out(r) for r in rows]
