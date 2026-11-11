"""In-app notifications.

Producers call `notify()` inside their own transaction (the caller commits). Notification text must never contain
MindCare content: well-being data stays inside MindCare.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Notification, Opportunity, SavedOpportunity
from app.models.enums import VerificationStatus

KINDS = {"info", "project", "achievement", "certificate", "deadline", "announcement", "career"}
DEADLINE_WINDOW = timedelta(days=3)


def clamp(title: str, body: str = "", kind: str = "info") -> dict:
    """Column limits are enforced on Postgres (not SQLite), so every producer goes through this."""
    return {"title": title[:200], "body": body[:2000], "kind": kind if kind in KINDS else "info"}


def notify(db: Session, user_id: uuid.UUID, title: str, body: str = "", *, kind: str = "info", link: str | None = None) -> Notification:
    n = Notification(user_id=user_id, link=link, **clamp(title, body, kind))
    db.add(n)
    return n


def sync_deadline_reminders(db: Session, user_id: uuid.UUID) -> int:
    """Lazily create one reminder per saved, verified opportunity whose deadline is within 3 days.

    Called when the student opens notifications, so no background scheduler is needed. Idempotent: an existing
    deadline notification for the same opportunity is never duplicated.
    """
    now = datetime.now(UTC)
    rows = db.execute(
        select(Opportunity.id, Opportunity.title, Opportunity.deadline)
        .join(SavedOpportunity, SavedOpportunity.opportunity_id == Opportunity.id)
        .where(
            SavedOpportunity.user_id == user_id,
            Opportunity.verification_status == VerificationStatus.verified,
            Opportunity.deadline.is_not(None),
            Opportunity.deadline >= now,
            Opportunity.deadline <= now + DEADLINE_WINDOW,
        )
    ).all()
    if not rows:
        return 0
    keys = {f"deadline:{oid}": (oid, title, deadline) for oid, title, deadline in rows}
    # Dismissed reminders keep their row (dismissed_at), so they never come back.
    existing = set(db.scalars(select(Notification.dedupe_key).where(
        Notification.user_id == user_id, Notification.dedupe_key.in_(list(keys)))).all())
    created = 0
    for key, (oid, title, deadline) in keys.items():
        if key in existing:
            continue
        due = deadline if deadline.tzinfo else deadline.replace(tzinfo=UTC)
        bd = timedelta(hours=6)  # count calendar days in Bangladesh time
        days = max(0, ((due + bd).date() - (now + bd).date()).days)
        when = "today" if days == 0 else "tomorrow" if days == 1 else f"in {days} days"
        try:
            with db.begin_nested():  # a parallel request may insert the same reminder: the unique key wins
                n = notify(db, user_id, f"Deadline {when}: {title}", "Check the official page and finish your application in time.",
                           kind="deadline", link=f"/opportunities-hub/{oid}")
                n.dedupe_key = key
            created += 1
        except IntegrityError:
            pass
    return created
