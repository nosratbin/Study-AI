import re
import uuid
from datetime import datetime

from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.config import get_settings
from app.core.security import MAX_PASSWORD_BYTES
from app.models.enums import Role


def _check_password(v: str) -> str:
    if len(v.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError(f"Password must be at most {MAX_PASSWORD_BYTES} bytes")
    if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
        raise ValueError("Password must contain at least one letter and one number")
    return v


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)

    _pw = field_validator("password")(_check_password)

    @field_validator("full_name")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Name is too short")
        return v


# Seeded demo accounts (app/seed.py) use this reserved domain so they can never receive mail or exist in the wild.
# Login accepts it only outside production; registration never does.
DEMO_EMAIL_DOMAIN = "demo.iccheghuri.local"


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=200)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        try:
            return validate_email(v.strip(), check_deliverability=False).normalized
        except EmailNotValidError as e:
            demo = v.strip().lower()
            if demo.endswith("@" + DEMO_EMAIL_DOMAIN) and get_settings().environment != "production":
                return demo
            raise ValueError(f"value is not a valid email address: {e}") from e


class GoogleIn(BaseModel):
    id_token: str = Field(min_length=20, max_length=5000)


class RefreshIn(BaseModel):
    refresh_token: str | None = None  # mobile sends it in the body; web uses the httpOnly cookie


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: Role
    avatar_url: str | None
    onboarding_completed: bool = False
    created_at: datetime


class AuthOut(BaseModel):
    user: UserOut
    # Only returned to native clients (X-Client-Type: mobile). Web gets httpOnly cookies instead.
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
