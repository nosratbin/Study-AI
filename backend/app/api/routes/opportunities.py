"""Opportunity Hub for students. Only admin-verified opportunities are ever returned."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Query, Response
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError

from app.core.deps import DbSession, StudentUser
from app.core.errors import ApiError
from app.models import Application, Opportunity, SavedOpportunity
from app.models.enums import ApplicationStatus, EducationLevel, OpportunityCategory
from app.schemas.opportunity import ApplicationIn, ApplicationOut, MatchOut, OpportunityOut, TrackedApplication
from app.services.opportunities import (
    application_out,
    get_verified,
    is_open,
    load_state,
    match,
    opportunity_out,
    verified_query,
)

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


def _sorted(rows: list[Opportunity]) -> list[Opportunity]:
    far = datetime.max.replace(tzinfo=UTC)
    from app.services.opportunities import aware

    return sorted(rows, key=lambda o: (aware(o.deadline) or far, o.title))


@router.get("", response_model=list[OpportunityOut])
def list_opportunities(
    user: StudentUser,
    db: DbSession,
    q: str | None = Query(default=None, max_length=100),
    category: OpportunityCategory | None = None,
    level: EducationLevel | None = None,
    include_closed: bool = False,
):
    query = verified_query()
    if category:
        query = query.where(Opportunity.category == category)
    if q and q.strip():
        term = q.strip().lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        like = f"%{term}%"
        query = query.where(or_(*(col.ilike(like, escape="\\") for col in (Opportunity.title, Opportunity.provider, Opportunity.description))))
    rows = db.scalars(query).all()
    now = datetime.now(UTC)
    if level:  # JSON list column: filter in Python (portable across SQLite/Postgres); empty list = all levels
        rows = [o for o in rows if not o.education_levels or level.value in o.education_levels]
    if not include_closed:
        rows = [o for o in rows if is_open(o, now)]
    state = load_state(db, user.id)
    return [opportunity_out(o, state, now) for o in _sorted(rows)]


@router.get("/match", response_model=list[MatchOut])
def match_opportunities(user: StudentUser, db: DbSession):
    return match(db, user)


@router.get("/saved", response_model=list[OpportunityOut])
def saved(user: StudentUser, db: DbSession):
    rows = db.scalars(
        verified_query().join(SavedOpportunity, SavedOpportunity.opportunity_id == Opportunity.id)
        .where(SavedOpportunity.user_id == user.id)
    ).all()
    state = load_state(db, user.id)
    return [opportunity_out(o, state) for o in _sorted(rows)]


@router.get("/applications", response_model=list[TrackedApplication])
def applications(user: StudentUser, db: DbSession):
    rows = db.execute(
        verified_query().add_columns(Application)
        .join(Application, Application.opportunity_id == Opportunity.id)
        .where(Application.user_id == user.id)
        .order_by(Application.updated_at.desc())
    ).all()
    state = load_state(db, user.id)
    return [TrackedApplication(opportunity=opportunity_out(o, state), application=application_out(a)) for o, a in rows]


def _verified_or_404(db, opportunity_id: uuid.UUID) -> Opportunity:
    o = get_verified(db, opportunity_id)
    if not o:
        raise ApiError(404, "opportunity_not_found", "This opportunity is not available.")
    return o


@router.get("/{opportunity_id}", response_model=OpportunityOut)
def get_opportunity(opportunity_id: uuid.UUID, user: StudentUser, db: DbSession):
    o = _verified_or_404(db, opportunity_id)
    return opportunity_out(o, load_state(db, user.id))


@router.post("/{opportunity_id}/save", response_model=OpportunityOut)
def save(opportunity_id: uuid.UUID, user: StudentUser, db: DbSession):
    o = _verified_or_404(db, opportunity_id)
    exists = db.scalar(select(SavedOpportunity).where(SavedOpportunity.user_id == user.id, SavedOpportunity.opportunity_id == o.id))
    if not exists:
        db.add(SavedOpportunity(user_id=user.id, opportunity_id=o.id))
        try:
            db.commit()
        except IntegrityError:  # double click: already saved
            db.rollback()
    return opportunity_out(o, load_state(db, user.id))


@router.delete("/{opportunity_id}/save", response_model=OpportunityOut)
def unsave(opportunity_id: uuid.UUID, user: StudentUser, db: DbSession):
    o = _verified_or_404(db, opportunity_id)
    row = db.scalar(select(SavedOpportunity).where(SavedOpportunity.user_id == user.id, SavedOpportunity.opportunity_id == o.id))
    if row:
        db.delete(row)
        db.commit()
    return opportunity_out(o, load_state(db, user.id))


@router.put("/{opportunity_id}/application", response_model=ApplicationOut)
def track_application(opportunity_id: uuid.UUID, body: ApplicationIn, user: StudentUser, db: DbSession):
    """Student's own record of where they are with an application. IccheGhuri does not submit anything."""
    o = _verified_or_404(db, opportunity_id)
    app = db.scalar(select(Application).where(Application.user_id == user.id, Application.opportunity_id == o.id))
    if not app:
        app = Application(user_id=user.id, opportunity_id=o.id)
        db.add(app)
    app.status = body.status
    app.notes = body.notes or None
    if body.status in (ApplicationStatus.applied, ApplicationStatus.accepted, ApplicationStatus.rejected):
        app.applied_at = app.applied_at or datetime.now(UTC)
    else:
        app.applied_at = None
    app.updated_at = datetime.now(UTC)
    # Tracking an application implies interest: keep it in the saved list (and its deadline on the dashboard).
    if not db.scalar(select(SavedOpportunity).where(SavedOpportunity.user_id == user.id, SavedOpportunity.opportunity_id == o.id)):
        db.add(SavedOpportunity(user_id=user.id, opportunity_id=o.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiError(409, "conflict", "This was updated in another tab. Refresh and try again.")
    db.refresh(app)
    return application_out(app)


@router.delete("/{opportunity_id}/application", status_code=204, response_class=Response)
def untrack_application(opportunity_id: uuid.UUID, user: StudentUser, db: DbSession):
    o = _verified_or_404(db, opportunity_id)
    app = db.scalar(select(Application).where(Application.user_id == user.id, Application.opportunity_id == o.id))
    if app:
        db.delete(app)
        db.commit()
    return Response(status_code=204)
