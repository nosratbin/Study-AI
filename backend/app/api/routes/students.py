from datetime import UTC, datetime

from fastapi import APIRouter

from app.core.deps import DbSession, StudentUser
from app.core.errors import ApiError
from app.models import StudentProfile, User
from app.schemas.student import CURRENT_YEAR, DashboardOut, OnboardingIn, ProfileOut, ProfileUpdateIn
from app.services.dashboard import build_dashboard

router = APIRouter(prefix="/students", tags=["students"])


def compute_is_minor(birth_year: int) -> bool:
    # Only the birth year is known, so be conservative: anyone who may still be 17 is a minor.
    return CURRENT_YEAR() - birth_year <= 18


def _profile(user: User, db) -> StudentProfile:
    if not user.student_profile:
        user.student_profile = StudentProfile()
        db.flush()
    return user.student_profile


def profile_out(p: StudentProfile) -> ProfileOut:
    return ProfileOut(
        education_level=p.education_level, institution=p.institution, class_or_year=p.class_or_year,
        district=p.district, birth_year=p.birth_year, is_minor=p.is_minor,
        guardian_consent_given=p.guardian_consent_at is not None, preferred_language=p.preferred_language,
        interests=p.interests or [], goals=p.goals, onboarding_completed=p.onboarding_completed,
        recommended_level=p.recommended_level,
    )


@router.get("/profile", response_model=ProfileOut)
def get_profile(user: StudentUser, db: DbSession):
    p = _profile(user, db)
    db.commit()
    return profile_out(p)


@router.post("/onboarding", response_model=ProfileOut)
def complete_onboarding(body: OnboardingIn, user: StudentUser, db: DbSession):
    p = _profile(user, db)
    is_minor = compute_is_minor(body.birth_year)
    if is_minor and not body.guardian_consent and p.guardian_consent_at is None:
        raise ApiError(
            422, "guardian_consent_required",
            "Students under 18 need a parent or guardian to agree before continuing.",
        )
    p.education_level = body.education_level
    p.institution = body.institution or None
    p.class_or_year = body.class_or_year or None
    p.district = body.district or None
    p.birth_year = body.birth_year
    p.is_minor = is_minor
    if is_minor and body.guardian_consent and p.guardian_consent_at is None:
        p.guardian_consent_at = datetime.now(UTC)
    p.preferred_language = body.preferred_language
    p.interests = sorted({i.lower() for i in body.interests})
    p.goals = body.goals or None
    p.onboarding_completed = True
    db.commit()
    return profile_out(p)


@router.patch("/profile", response_model=ProfileOut)
def update_profile(body: ProfileUpdateIn, user: StudentUser, db: DbSession):
    p = _profile(user, db)
    data = body.model_dump(exclude_unset=True)
    if "full_name" in data:
        if data["full_name"] is None:
            raise ApiError(422, "validation_error", "Name cannot be empty.")
        user.full_name = " ".join(data.pop("full_name").split())
    for field in ("education_level", "preferred_language"):
        if field in data and data[field] is None:
            raise ApiError(422, "validation_error", f"{field} cannot be empty.")
    if "interests" in data and data["interests"] is not None:
        data["interests"] = sorted({i.lower() for i in data["interests"]})
    for k, v in data.items():
        setattr(p, k, v)
    db.commit()
    return profile_out(p)


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(user: StudentUser, db: DbSession):
    if not user.student_profile or not user.student_profile.onboarding_completed:
        raise ApiError(409, "onboarding_required", "Finish setting up your profile first.")
    return build_dashboard(db, user)
