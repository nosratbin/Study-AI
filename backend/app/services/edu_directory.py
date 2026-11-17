"""Search the institution and district lists in app/data/ (built by scripts/build_edu_data.py from open data).

Suggestions only: profiles still accept any institution or district text, because no list covers every school.
"""

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
_SPLIT = re.compile(r"[^\w]+", re.UNICODE)


def _tokens(text: str) -> list[str]:
    return [t for t in _SPLIT.split(text.casefold().replace("&", " and ")) if t]


@dataclass(frozen=True)
class _Entry:
    name: str
    kinds: tuple[str, ...]
    key: str  # name tokens joined by spaces
    fields: tuple[tuple[str, ...], ...]  # token lists to match against: the name, then each alias
    bn: str


@lru_cache
def _institutions() -> tuple[_Entry, ...]:
    items = json.loads((DATA / "institutions.json").read_text(encoding="utf-8"))["items"]
    out = []
    for i in items:
        name_tokens = tuple(_tokens(i["name"]))
        fields = (name_tokens, *(tuple(_tokens(a)) for a in i.get("aliases", [])))
        out.append(_Entry(i["name"], tuple(i["kinds"]), " ".join(name_tokens), fields, i.get("bn", "")))
    return tuple(out)


@lru_cache
def districts() -> list[dict]:
    return json.loads((DATA / "districts.json").read_text(encoding="utf-8"))["items"]


def _field_matches(query: list[str], field: tuple[str, ...]) -> bool:
    """Every query word starts some word of the field: "dhaka uni" matches "University of Dhaka"."""
    return all(any(w.startswith(q) for w in field) for q in query)


def search_institutions(q: str, level: str | None = None, limit: int = 8) -> list[dict]:
    query = _tokens(q)
    if not query or len("".join(query)) < 2:
        return []
    joined = " ".join(query)
    ranked = []
    for e in _institutions():
        if any(" ".join(f) == joined for f in e.fields[1:]):
            rank = 0  # an exact short name: "du", "buet", "dhaka university"
        elif e.key.startswith(joined):
            rank = 1  # the name starts with what was typed
        elif _field_matches(query, e.fields[0]):
            rank = 2
        elif any(_field_matches(query, f) for f in e.fields[1:]):
            rank = 3
        elif e.bn and q.strip() in e.bn:
            rank = 4  # typed in Bangla
        else:
            continue
        # Places that serve the student's level come first; unclassified places count as serving every level.
        off_level = bool(level and e.kinds and level not in e.kinds)
        ranked.append((off_level, rank, len(e.name), e))
    ranked.sort(key=lambda r: r[:3])
    return [{"name": e.name, "kinds": list(e.kinds)} for *_, e in ranked[:limit]]
