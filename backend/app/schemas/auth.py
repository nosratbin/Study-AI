import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

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


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


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
