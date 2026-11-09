"""Schemas for the Opportunity Hub (student views, matcher, admin verification)."""

from datetime import UTC, datetime
from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, StringConstraints, field_validator, model_validator

from app.models.enums import ApplicationStatus, EducationLevel, OpportunityCategory, VerificationStatus

CATEGORY_LABELS: dict[OpportunityCategory, str] = {
    OpportunityCategory.gov_scholarship: "Government scholarship",
    OpportunityCategory.private_scholarship: "Private scholarship",
    OpportunityCategory.merit_scholarship: "Merit scholarship",
    OpportunityCategory.financial_assistance: "Financial assistance",
    OpportunityCategory.stipend: "Stipend",
    OpportunityCategory.national_competition: "National competition",
    OpportunityCategory.international_competition: "International competition",
    OpportunityCategory.hackathon: "Hackathon",
    OpportunityCategory.ai_olympiad: "AI Olympiad",
    OpportunityCategory.cultural: "Cultural competition",
    OpportunityCategory.sports: "Sports competition",
    OpportunityCategory.research: "Research opportunity",
    OpportunityCategory.internship: "Internship",
    OpportunityCategory.study_abroad: "Study abroad",
}


class ApplicationOut(BaseModel):
    status: ApplicationStatus
    notes: str | None
    applied_at: datetime | None
    updated_at: datetime


class OpportunityOut(BaseModel):
    """What students see. Only ever built from verified opportunities."""

    id: str
    title: str
    description: str
    category: OpportunityCategory
    category_label: str
    provider: str
    eligibility: str
    education_levels: list[EducationLevel]
    deadline: datetime | None
    days_left: int | None
    is_closed: bool
    required_documents: list[str]
    official_url: str
    verified_at: datetime | None
    saved: bool
    application: ApplicationOut | None


class MatchOut(BaseModel):
    opportunity: OpportunityOut
    score: int
    reasons: list[str]


class ApplicationIn(BaseModel):
    status: ApplicationStatus
    notes: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] | None = None


class TrackedApplication(BaseModel):
    opportunity: OpportunityOut
    application: ApplicationOut


# ---------- Admin ----------

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=250)]
Doc = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


def _official_url(v: str) -> str:
    v = v.strip()
    u = urlparse(v)
    if u.scheme != "https" or not u.netloc or "@" in u.netloc or " " in v:
        raise ValueError("Use the full official https:// link, e.g. https://www.example.gov.bd/scholarship")
    return v


class OpportunityIn(BaseModel):
    title: Title
    description: Annotated[str, StringConstraints(strip_whitespace=True, min_length=20, max_length=8000)]
    category: OpportunityCategory
    provider: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=200)]
    eligibility: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=4000)]
    education_levels: list[EducationLevel] = Field(default_factory=list, max_length=3)  # empty = all levels
    deadline: datetime | None = None  # None = rolling / not announced
    required_documents: list[Doc] = Field(default_factory=list, max_length=25)
    official_url: Annotated[str, StringConstraints(max_length=500)]

    _url = field_validator("official_url")(_official_url)

    @field_validator("education_levels")
    @classmethod
    def _dedupe_levels(cls, v: list[EducationLevel]) -> list[EducationLevel]:
        return sorted(set(v), key=list(EducationLevel).index)

    @field_validator("deadline")
    @classmethod
    def _aware(cls, v: datetime | None) -> datetime | None:
        if v is not None and v.tzinfo is None:
            raise ValueError("Deadline must include a timezone (e.g. 2026-12-31T23:59:00+06:00)")
        return v.astimezone(UTC) if v is not None else None  # stored as UTC on every database


class OpportunityUpdate(BaseModel):
    """Partial edit. Any content change sends a verified opportunity back to review."""

    title: Title | None = None
    description: Annotated[str, StringConstraints(strip_whitespace=True, min_length=20, max_length=8000)] | None = None
    category: OpportunityCategory | None = None
    provider: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=200)] | None = None
    eligibility: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=4000)] | None = None
    education_levels: list[EducationLevel] | None = Field(default=None, max_length=3)
    deadline: datetime | None = None
    required_documents: list[Doc] | None = Field(default=None, max_length=25)
    official_url: Annotated[str, StringConstraints(max_length=500)] | None = None

    @field_validator("official_url")
    @classmethod
    def _url(cls, v: str | None) -> str | None:
        return None if v is None else _official_url(v)

    @field_validator("deadline")
    @classmethod
    def _aware(cls, v: datetime | None) -> datetime | None:
        if v is not None and v.tzinfo is None:
            raise ValueError("Deadline must include a timezone (e.g. 2026-12-31T23:59:00+06:00)")
        return v.astimezone(UTC) if v is not None else None  # stored as UTC on every database


class VerifyIn(BaseModel):
    status: Literal["verified", "rejected"]
    source_note: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] | None = None

    @model_validator(mode="after")
    def _note_required(self):
        if self.status == "verified" and len(self.source_note or "") < 10:
            raise ValueError("Say where you confirmed the details (official page, notice, date checked) before verifying.")
        return self


class OpportunityAdminOut(BaseModel):
    id: str
    title: str
    description: str
    category: OpportunityCategory
    category_label: str
    provider: str
    eligibility: str
    education_levels: list[EducationLevel]
    deadline: datetime | None
    required_documents: list[str]
    official_url: str
    verification_status: VerificationStatus
    verified_by_name: str | None
    verified_at: datetime | None
    source_note: str | None
    saved_count: int
    created_at: datetime
    updated_at: datetime
