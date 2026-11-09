"""Assessment scoring. Scores come ONLY from stored answer keys — never from an LLM."""

from collections import defaultdict
from dataclasses import dataclass

from app.models import AssessmentQuestion
from app.models.enums import EducationLevel

STRENGTH_PCT = 75
WEAKNESS_PCT = 50
TIME_GRACE_S = 120  # network / clock slack after the time limit
SKIP_STAGE_PCT = 80  # topic test score that lets a student skip a roadmap stage

TOPIC_LABELS = {
    "programming": "Programming & Python",
    "python": "Python",
    "ai_fundamentals": "AI Fundamentals",
    "machine_learning": "Machine Learning",
    "deep_learning": "Deep Learning",
    "data": "Data & Statistics",
    "ethics": "Responsible AI",
}


@dataclass
class Scored:
    score: int
    max_score: int
    answers: dict[str, int]
    correct_ids: set[str]
    topic_breakdown: dict[str, dict[str, int]]
    difficulty_breakdown: dict[int, dict[str, int]]

    @property
    def percent(self) -> int:
        return round(100 * self.score / self.max_score) if self.max_score else 0


def score_attempt(questions: list[AssessmentQuestion], submitted: dict[str, int]) -> Scored:
    """One point per question. Answers for unknown question ids are ignored."""
    by_topic: dict[str, dict[str, int]] = defaultdict(lambda: {"correct": 0, "total": 0})
    by_diff: dict[int, dict[str, int]] = defaultdict(lambda: {"correct": 0, "total": 0})
    answers: dict[str, int] = {}
    correct_ids: set[str] = set()
    for q in questions:
        qid = str(q.id)
        chosen = submitted.get(qid)
        if chosen is not None and 0 <= chosen < len(q.options):
            answers[qid] = chosen
        ok = answers.get(qid) == q.correct_option
        if ok:
            correct_ids.add(qid)
        for bucket in (by_topic[q.topic_tag], by_diff[q.difficulty]):
            bucket["total"] += 1
            bucket["correct"] += int(ok)
    return Scored(
        score=len(correct_ids), max_score=len(questions), answers=answers, correct_ids=correct_ids,
        topic_breakdown=dict(by_topic), difficulty_breakdown=dict(by_diff),
    )


def pct(b: dict[str, int]) -> int:
    return round(100 * b["correct"] / b["total"]) if b.get("total") else 0


def strengths_weaknesses(topic_breakdown: dict[str, dict[str, int]]) -> tuple[list[str], list[str]]:
    strengths = sorted(t for t, b in topic_breakdown.items() if pct(b) >= STRENGTH_PCT)
    weaknesses = sorted(t for t, b in topic_breakdown.items() if pct(b) < WEAKNESS_PCT)
    return strengths, weaknesses


def recommend_level(s: Scored) -> EducationLevel:
    """Placement rule (difficulty 1 = school, 2 = college, 3 = university questions).

    A level is recommended when the student answers at least 60% of that level's
    questions correctly AND passed the level below it.
    """
    def ok(d: int) -> bool:
        b = s.difficulty_breakdown.get(d)
        return bool(b) and pct(b) >= 60

    if ok(1) and ok(2) and ok(3):
        return EducationLevel.university
    if ok(1) and ok(2):
        return EducationLevel.college
    return EducationLevel.school


def topic_label(tag: str) -> str:
    return TOPIC_LABELS.get(tag, tag.replace("_", " ").title())
