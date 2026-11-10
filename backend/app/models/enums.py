"""String enums stored as VARCHAR + CHECK constraint (portable across SQLite and Postgres)."""

from enum import StrEnum

from sqlalchemy import Enum as SAEnum


class Role(StrEnum):
    student = "student"
    teacher = "teacher"
    admin = "admin"


class EducationLevel(StrEnum):
    school = "school"
    college = "college"
    university = "university"


class Language(StrEnum):
    en = "en"
    bn = "bn"


class ProgressStatus(StrEnum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"


class ChatRole(StrEnum):
    user = "user"
    assistant = "assistant"


class ProjectStatus(StrEnum):
    draft = "draft"
    submitted = "submitted"
    reviewed = "reviewed"


class OpportunityCategory(StrEnum):
    gov_scholarship = "gov_scholarship"
    private_scholarship = "private_scholarship"
    merit_scholarship = "merit_scholarship"
    financial_assistance = "financial_assistance"
    stipend = "stipend"
    national_competition = "national_competition"
    international_competition = "international_competition"
    hackathon = "hackathon"
    ai_olympiad = "ai_olympiad"
    cultural = "cultural"
    sports = "sports"
    research = "research"
    internship = "internship"
    study_abroad = "study_abroad"


class VerificationStatus(StrEnum):
    unverified = "unverified"
    verified = "verified"
    rejected = "rejected"


class ApplicationStatus(StrEnum):
    planned = "planned"
    applied = "applied"
    accepted = "accepted"
    rejected = "rejected"


class SkillKind(StrEnum):
    course = "course"
    skill = "skill"
    certificate = "certificate"
    project = "project"
    award = "award"
    scholarship = "scholarship"
    competition = "competition"
    sport = "sport"
    cultural = "cultural"
    leadership = "leadership"
    volunteering = "volunteering"


class SessionStatus(StrEnum):
    requested = "requested"
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


class TaskStatus(StrEnum):
    todo = "todo"
    done = "done"


class SupportResourceKind(StrEnum):
    helpline = "helpline"
    counsellor = "counsellor"
    organisation = "organisation"


class SupportTopic(StrEnum):
    stress = "stress"
    study_pressure = "study_pressure"
    relationships = "relationships"
    feeling_low = "feeling_low"
    other = "other"


class SupportRequestStatus(StrEnum):
    open = "open"
    in_progress = "in_progress"
    closed = "closed"


def str_enum(enum_cls: type[StrEnum], name: str) -> SAEnum:
    return SAEnum(
        enum_cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=32,
        values_callable=lambda e: [m.value for m in e],
        validate_strings=True,
    )
