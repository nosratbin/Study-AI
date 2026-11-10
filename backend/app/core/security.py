import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal

import bcrypt
import jwt

from app.core.config import get_settings

TokenType = Literal["access", "refresh"]

# bcrypt only uses the first 72 bytes; reject longer input in validation instead of truncating silently.
MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_token(user_id: uuid.UUID, role: str, token_version: int, kind: TokenType, sid: str | None = None) -> str:
    """`sid` ties every token of one sign-in together (it is carried through refreshes), so logout can
    revoke the whole session, including token pairs an attacker refreshed from a copied refresh token."""
    s = get_settings()
    now = datetime.now(UTC)
    ttl = timedelta(minutes=s.access_token_minutes) if kind == "access" else timedelta(days=s.refresh_token_days)
    payload = {
        "sub": str(user_id),
        "role": role,
        "ver": token_version,
        "typ": kind,
        "iat": now,
        "exp": now + ttl,
        "jti": uuid.uuid4().hex,
        "sid": sid or uuid.uuid4().hex,
    }
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def _session_key(sid: str) -> str:
    return f"sid:{sid}"


def is_revoked(db, payload: dict) -> bool:
    """True if this token, or the sign-in session it belongs to, was logged out."""
    from app.models import RevokedToken

    from sqlalchemy import select

    jti, sid = payload.get("jti"), payload.get("sid")
    if not jti:
        return True
    keys = [jti, _session_key(sid)] if sid else [jti]
    # One round trip per request: the token's own id and its session id.
    return db.scalar(select(RevokedToken.jti).where(RevokedToken.jti.in_(keys)).limit(1)) is not None


def _add(db, key: str, expires_at: datetime) -> None:
    from app.models import RevokedToken

    if db.get(RevokedToken, key) is None:
        db.add(RevokedToken(jti=key, expires_at=expires_at))
        db.flush()  # so a second revoke in this transaction (same sid) sees the row


def revoke(db, payload: dict) -> None:
    """Revoke a token and its whole sign-in session until they would have expired anyway.
    Also prunes expired rows so the table stays small."""
    from sqlalchemy import delete

    from app.models import RevokedToken

    jti, exp, sid = payload.get("jti"), payload.get("exp"), payload.get("sid")
    if not jti or not exp:
        return
    now = datetime.now(UTC)
    db.execute(delete(RevokedToken).where(RevokedToken.expires_at < now))
    _add(db, jti, datetime.fromtimestamp(exp, UTC))
    if sid:
        # Any token of this session (refreshed or not) expires within refresh_token_days from now.
        _add(db, _session_key(sid), now + timedelta(days=get_settings().refresh_token_days))


def decode_token(token: str, expected: TokenType) -> dict:
    s = get_settings()
    payload = jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm], options={"require": ["exp", "sub", "typ", "jti"]})
    if payload.get("typ") != expected:
        raise jwt.InvalidTokenError("wrong token type")
    return payload
