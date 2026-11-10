"""Encryption at rest for sensitive student text (MindCare journal notes, support requests)."""

import base64
import hashlib
import logging
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings

log = logging.getLogger("learn_ai.crypto")


@lru_cache
def _fernet() -> Fernet:
    key = get_settings().data_encryption_key
    if not key:
        # Development/test only (production refuses to start without a key): a fixed, non-secret key.
        log.warning("DATA_ENCRYPTION_KEY is not set; using an insecure development key")
        key = base64.urlsafe_b64encode(hashlib.sha256(b"learn-ai-insecure-dev-data-key").digest()).decode()
    return Fernet(key.encode())


def seal(text: str | None) -> str | None:
    return _fernet().encrypt(text.encode()).decode() if text else None


def unseal(token: str | None) -> str | None:
    if not token:
        return None
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        log.error("could not decrypt a stored note (was DATA_ENCRYPTION_KEY changed?)")
        return None
