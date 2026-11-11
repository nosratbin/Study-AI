"""Career Navigator for students: explore careers, see skill gaps, save goals, get an AI study plan."""

import re
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.config import get_settings
from app.core.deps import DbSession, StudentUser
from app.core.errors import ApiError
from app.core.rate_limit import limiter
from app.models import Career, CareerGoal
from app.schemas.phase5 import CareerCard, CareerDetail, CareerGoalIn, CareerPlanOut, PlanStep
from app.services.careers import MAX_GOALS, career_detail, load_evidence, published_careers, ranked_careers
from app.services.llm import ChatTurn, LLMProvider, get_llm, parse_json

router = APIRouter(prefix="/careers", tags=["careers"])


def _career(db, slug: str) -> Career:
    c = db.scalar(published_careers().where(Career.slug == slug))
    if not c:
        raise ApiError(404, "career_not_found", "Career not found.")
    return c


@router.get("", response_model=list[CareerCard])
def careers(user: StudentUser, db: DbSession):
    return ranked_careers(db, load_evidence(db, user))


@router.get("/{slug}", response_model=CareerDetail)
def career(slug: str, user: StudentUser, db: DbSession):
    return career_detail(db, _career(db, slug), load_evidence(db, user))


@router.put("/{slug}/goal", response_model=CareerDetail)
def save_goal(slug: str, body: CareerGoalIn, user: StudentUser, db: DbSession):
    c = _career(db, slug)
    goal = db.scalar(select(CareerGoal).where(CareerGoal.user_id == user.id, CareerGoal.career_id == c.id))
    if goal:
        goal.note = body.note
    else:
        visible = select(func.count(CareerGoal.id)).join(Career, Career.id == CareerGoal.career_id).where(
            CareerGoal.user_id == user.id, Career.is_published.is_(True))
        if (db.scalar(visible) or 0) >= MAX_GOALS:  # goals on unpublished careers are hidden, so they don't count
            raise ApiError(409, "too_many_goals", f"You can save up to {MAX_GOALS} career goals. Remove one first.")
        try:
            with db.begin_nested():
                db.add(CareerGoal(user_id=user.id, career_id=c.id, note=body.note))
        except IntegrityError:  # a double click saved it already
            pass
    db.commit()
    return career_detail(db, c, load_evidence(db, user))


@router.delete("/{slug}/goal", status_code=204, response_class=Response)
def remove_goal(slug: str, user: StudentUser, db: DbSession):
    c = db.scalar(select(Career).where(Career.slug == slug))
    if c:
        goal = db.scalar(select(CareerGoal).where(CareerGoal.user_id == user.id, CareerGoal.career_id == c.id))
        if goal:
            db.delete(goal)
            db.commit()
    return Response(status_code=204)


_MONTHS = r"jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?"
UNVERIFIABLE = re.compile(
    r"https?://|www\.|\.(com|org|edu|gov|bd)\b|[৳$€£]|\b(bdt|tk|taka|salary|salaries|stipend|gpa|cgpa|lakh|crore|usd|dollars?|rupees?)\b|বেতন|টাকা"
    rf"|\b\d{{1,2}}(st|nd|rd|th)?\s+({_MONTHS})\b|\b({_MONTHS})\s+\d{{1,2}}\b|\b\d{{1,2}}[/-]\d{{1,2}}[/-]\d{{2,4}}\b",
    re.IGNORECASE,
)

PLAN_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "steps": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {"title": {"type": "STRING"}, "detail": {"type": "STRING"}},
                                             "required": ["title", "detail"]}},
    },
    "required": ["steps"],
}


@router.post("/{slug}/plan", response_model=CareerPlanOut)
def ai_plan(slug: str, user: StudentUser, db: DbSession, llm: Annotated[LLMProvider, Depends(get_llm)]):
    c = _career(db, slug)
    s = get_settings()
    if (wait := limiter.hit(f"ai:{user.id}", s.ai_messages_per_minute, 60)) is not None:
        raise ApiError(429, "rate_limited", "Please wait a moment before asking again.", headers={"Retry-After": str(int(wait) + 1)})
    detail = career_detail(db, c, load_evidence(db, user))
    p = user.student_profile
    lang = "Bangla" if p and p.preferred_language == "bn" else "English"
    level = (p.education_level or "college") if p else "college"
    have = [sk.name for sk in detail.skills if sk.have]
    missing = [sk.name for sk in detail.skills if not sk.have]
    courses = [f"{x.title} ({x.percent}% done)" for x in detail.courses]
    system = (
        f"You are a friendly career guide for a {level}-level student in Bangladesh. Reply in {lang}. "
        "Write a practical 4-6 step plan to move toward the career below over the next 6-12 months. "
        "Use only the IccheGhuri courses listed and general, widely true advice (practice projects, competitions, communities). "
        "Never invent salaries, admission requirements, scholarship names, deadlines, institutions' rules or links. "
        "Do not judge or score the student. Each step: a short title and 1-3 sentences."
    )
    content = (f"Career: {c.title} ({c.field})\nSummary: {c.summary}\nSkills the student has: {', '.join(have) or 'none yet'}\n"
               f"Skills to build: {', '.join(missing) or 'none'}\nIccheGhuri courses: {', '.join(courses) or 'none'}\n"
               f"Typical education paths: {'; '.join(c.education_paths or []) or '-'}")
    res = llm.generate(system, [ChatTurn("user", content)], json_schema=PLAN_SCHEMA, temperature=0.4, max_tokens=1500)
    if res.blocked:
        raise ApiError(422, "ai_blocked", "The AI couldn't write a plan for this career. Please try again.")
    data = parse_json(res.text)
    steps = data.get("steps") if isinstance(data, dict) else None
    if not isinstance(steps, list):
        raise ApiError(502, "ai_bad_output", "The AI returned an unexpected format. Please try again.")
    clean = [PlanStep(title=str(x.get("title", "")).strip()[:120], detail=str(x.get("detail", "")).strip()[:600])
             for x in steps if isinstance(x, dict) and str(x.get("title", "")).strip()]
    # The prompt forbids invented facts; this backs it up by dropping steps that carry links, money or dates.
    clean = [st for st in clean if not UNVERIFIABLE.search(f"{st.title} {st.detail}")][:6]
    if not clean:
        raise ApiError(502, "ai_bad_output", "The AI returned an empty plan. Please try again.")
    return CareerPlanOut(steps=clean, note="AI-generated suggestion. Check admission rules and deadlines with official sources.")
