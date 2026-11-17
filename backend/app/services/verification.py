"""Email ownership checks for password sign-up.

Each check sends one email holding both a 6-digit code (typed on the verify screen, works across devices) and a link
(one click). Only HMAC hashes are stored. A code allows MAX_ATTEMPTS guesses, then the student must ask for a new one;
re-sending replaces the old code and link.
"""

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from html import escape

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import EmailVerification, User
from app.services.email import Mail

MAX_ATTEMPTS = 5


def _hash(value: str) -> str:
    return hmac.new(get_settings().jwt_secret.encode(), value.encode(), hashlib.sha256).hexdigest()


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)  # SQLite hands back naive datetimes


def pending(db: Session, user: User) -> EmailVerification | None:
    return db.scalar(select(EmailVerification).where(EmailVerification.user_id == user.id))


def resend_wait(db: Session, user: User) -> int:
    """Seconds until another email may be sent to this user (0 = now)."""
    row = pending(db, user)
    if not row:
        return 0
    elapsed = (datetime.now(UTC) - _aware(row.created_at)).total_seconds()
    return max(0, int(get_settings().email_resend_seconds - elapsed))


def start(db: Session, user: User) -> Mail:
    """Replace any pending check with a new code and link, and return the email to send. The caller commits."""
    s = get_settings()
    code = f"{secrets.randbelow(1_000_000):06d}"
    token = secrets.token_urlsafe(32)
    old = pending(db, user)
    if old:
        db.delete(old)
        db.flush()
    db.add(EmailVerification(
        user_id=user.id, code_hash=_hash(code), token_hash=_hash(token),
        expires_at=datetime.now(UTC) + timedelta(minutes=s.email_code_minutes), attempts=0,
    ))
    # The token travels in the URL fragment, which browsers never send to servers or in Referer headers.
    link = f"{s.web_app_url.rstrip('/')}/verify-email#token={token}"
    return _mail(user, code, link, s.email_code_minutes)


def check_code(db: Session, user: User, code: str) -> str | None:
    """Return None when the code is right, else an error code: 'invalid', 'expired' or 'locked'."""
    row = pending(db, user)
    if not row:
        return "expired"
    if _aware(row.expires_at) < datetime.now(UTC):
        return "expired"
    if row.attempts >= MAX_ATTEMPTS:
        return "locked"
    if not hmac.compare_digest(row.code_hash, _hash(code)):
        row.attempts += 1
        return "locked" if row.attempts >= MAX_ATTEMPTS else "invalid"
    return None


def user_for_token(db: Session, token: str) -> tuple[User | None, str | None]:
    row = db.scalar(select(EmailVerification).where(EmailVerification.token_hash == _hash(token)))
    if not row:
        return None, "invalid"
    if _aware(row.expires_at) < datetime.now(UTC):
        return None, "expired"
    return db.get(User, row.user_id), None


def complete(db: Session, user: User) -> None:
    row = pending(db, user)
    if row:
        db.delete(row)
    user.email_verified_at = datetime.now(UTC)


def _mail(user: User, code: str, link: str, minutes: int) -> Mail:
    first = escape(user.full_name.split(" ")[0])
    text = (
        f"Hi {user.full_name.split(' ')[0]},\n\n"
        f"Your IccheGhuri verification code is {code}\n\n"
        f"Or open this link to verify your email:\n{link}\n\n"
        f"The code and link work for {minutes} minutes. If you didn't create an IccheGhuri account, ignore this email."
    )
    html = f"""<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#172033">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px">
    <tr><td style="padding:32px">
      <p style="margin:0 0 16px;font-size:16px">Hi {first},</p>
      <p style="margin:0 0 8px;font-size:15px;color:#4b5563">Your IccheGhuri verification code is</p>
      <p style="margin:0 0 24px;font-size:32px;font-weight:bold;letter-spacing:6px">{code}</p>
      <p style="margin:0 0 24px">
        <a href="{escape(link)}" style="display:inline-block;padding:12px 20px;background:#ea580c;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:bold">Verify my email</a>
      </p>
      <p style="margin:0;font-size:13px;color:#6b7280">The code and link work for {minutes} minutes. If you didn't create an IccheGhuri account, ignore this email.</p>
    </td></tr>
  </table>
</body></html>"""
    return Mail(to=user.email, subject=f"{code} is your IccheGhuri verification code", text=text, html=html)
