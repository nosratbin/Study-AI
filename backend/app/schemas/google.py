"""Schemas for the Google Workspace integration."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints, field_validator

Feature = Literal["drive", "calendar"]


class GoogleFeatures(BaseModel):
    drive: bool
    calendar: bool


class GoogleStatus(BaseModel):
    configured: bool
    connected: bool
    email: str | None = None
    features: GoogleFeatures


class ConnectIn(BaseModel):
    features: list[Feature] = Field(min_length=1, max_length=2)


class ConnectOut(BaseModel):
    auth_url: str


class DriveLessonIn(BaseModel):
    lesson_id: uuid.UUID
    notes: Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)] | None = None
    # False: return the Doc already saved for this lesson if there is one. True: always make a new copy.
    new_copy: bool = False


class DocOut(BaseModel):
    id: str
    name: str
    web_view_link: str | None
    existing: bool = False  # True when an earlier copy was returned instead of creating a new Doc


class CalendarOpportunityIn(BaseModel):
    opportunity_id: uuid.UUID


class ReminderIn(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=200)]
    kind: Literal["class", "exam", "study", "other"] = "study"
    starts_at: datetime
    duration_min: int = Field(default=60, ge=15, le=480)
    remind_minutes: Literal[10, 30, 60, 1440] = 30
    notes: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] | None = None
    # Generated once per form by the client; resending the same id (double click, retry) never duplicates the event.
    request_id: uuid.UUID = Field(default_factory=uuid.uuid4)

    @field_validator("starts_at")
    @classmethod
    def _future(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("Start time must include a timezone.")
        now = datetime.now(UTC)
        if v < now - timedelta(minutes=5):
            raise ValueError("Pick a time in the future.")
        if v > now + timedelta(days=366):
            raise ValueError("Pick a time within the next year.")
        return v


class EventOut(BaseModel):
    id: str
    html_link: str | None
    created: bool = True  # False when an existing event was updated instead
