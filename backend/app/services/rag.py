"""Retrieval-augmented generation over published lesson content.

Ingest:   python -m app.services.rag        (embeds new/changed lessons; needs GEMINI_API_KEY)
Retrieve: retrieve(db, llm, query, level)  -> list of chunks with similarity
"""

import hashlib
import logging
import math
from dataclasses import dataclass

from sqlalchemy import delete, select, type_coerce
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import ApiError
from app.models import Course, KnowledgeChunk, Lesson
from app.models.enums import EducationLevel
from app.services.llm import LLMProvider

log = logging.getLogger("iccheghuri.rag")

MAX_CHARS = 900
MIN_SIMILARITY = 0.35  # below this a chunk is unlikely to be relevant


@dataclass
class Retrieved:
    chunk_id: str
    title: str
    course_id: str | None
    source_id: str
    content: str
    score: float


def _blocks(md: str) -> list[str]:
    """Paragraph blocks split on blank lines, never splitting inside a fenced code block."""
    blocks: list[str] = []
    cur: list[str] = []
    in_fence = False
    for line in md.strip().splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
        if not in_fence and not line.strip():
            if cur:
                blocks.append("\n".join(cur))
                cur = []
            continue
        cur.append(line)
    if cur:
        blocks.append("\n".join(cur))
    return blocks


def _hard_split(block: str, max_chars: int) -> list[str]:
    """Split an oversized block on line boundaries (mid-line only as a last resort)."""
    parts: list[str] = []
    cur = ""
    for line in block.splitlines():
        while len(line) > max_chars:
            if cur:
                parts.append(cur)
                cur = ""
            parts.append(line[:max_chars])
            line = line[max_chars:]
        if cur and len(cur) + len(line) + 1 > max_chars:
            parts.append(cur)
            cur = line
        else:
            cur = f"{cur}\n{line}" if cur else line
    if cur:
        parts.append(cur)
    return parts


def chunk_text(md: str, max_chars: int = MAX_CHARS) -> list[str]:
    """Pack markdown paragraphs into chunks of at most max_chars. Code blocks stay whole when they fit."""
    chunks: list[str] = []
    cur = ""
    for b in _blocks(md):
        for piece in ([b] if len(b) <= max_chars else _hard_split(b, max_chars)):
            if cur and len(cur) + len(piece) + 2 > max_chars:
                chunks.append(cur)
                cur = piece
            else:
                cur = f"{cur}\n\n{piece}" if cur else piece
    if cur:
        chunks.append(cur)
    return chunks


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def ingest_lessons(db: Session, llm: LLMProvider) -> dict:
    """Embed published lessons. Unchanged lessons (same content hash) are skipped."""
    stats = {"lessons": 0, "embedded_chunks": 0, "skipped": 0, "failed": 0, "purged": 0}
    rows = db.execute(
        select(Lesson, Course).join(Course, Course.id == Lesson.course_id).where(Course.is_published.is_(True))
    ).all()

    # Purge chunks for lessons that were deleted or unpublished.
    live_ids = {str(lesson.id) for lesson, _ in rows}
    stale = [cid for cid, sid in db.execute(
        select(KnowledgeChunk.id, KnowledgeChunk.source_id).where(KnowledgeChunk.source_type == "lesson")
    ).all() if sid not in live_ids]
    if stale:
        db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.id.in_(stale)))
        db.commit()
        stats["purged"] = len(stale)

    for lesson, course in rows:
        stats["lessons"] += 1
        text = f"# {course.title} — {lesson.title}\n\n{lesson.content_md}"
        h = _hash(f"{course.level}|{text}")
        existing = db.scalars(
            select(KnowledgeChunk).where(KnowledgeChunk.source_type == "lesson", KnowledgeChunk.source_id == str(lesson.id))
        ).all()
        if existing and all(c.content_hash == h and c.embedding is not None for c in existing):
            stats["skipped"] += 1
            continue
        parts = chunk_text(text)
        try:
            vectors = llm.embed(parts, task="document")
        except ApiError as e:  # one bad lesson must not abort the whole ingest
            log.warning("embedding failed for lesson %s: %s", lesson.id, e.code)
            stats["failed"] += 1
            continue
        db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.source_type == "lesson",
                                                KnowledgeChunk.source_id == str(lesson.id)))
        for i, (part, vec) in enumerate(zip(parts, vectors, strict=True)):
            db.add(KnowledgeChunk(
                source_type="lesson", source_id=str(lesson.id), course_id=course.id,
                title=f"{course.title}: {lesson.title}"[:250], level=course.level, chunk_index=i,
                content=part, content_hash=h, embedding=vec,
            ))
            stats["embedded_chunks"] += 1
        db.commit()
    return stats


def vector_distance(qvec: list[float]):
    """pgvector cosine distance (<=>). type_coerce exposes Vector's comparator on our TypeDecorator column."""
    from pgvector.sqlalchemy import Vector

    return type_coerce(KnowledgeChunk.embedding, Vector(get_settings().embedding_dim)).cosine_distance(qvec)


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def retrieve(db: Session, llm: LLMProvider, query: str, level: EducationLevel | None, k: int | None = None) -> list[Retrieved]:
    """Top-k chunks for the query, preferring the student's level. Never raises: RAG is best-effort."""
    k = k or get_settings().rag_top_k
    try:
        has_any = db.scalar(select(KnowledgeChunk.id).where(KnowledgeChunk.embedding.is_not(None)).limit(1))
        if not has_any:
            return []
        qvec = llm.embed([query], task="query")[0]
    except ApiError as e:
        log.warning("retrieval skipped: %s", e.code)
        return []

    # Only chunks from currently published courses can reach the tutor prompt.
    base = (select(KnowledgeChunk).join(Course, Course.id == KnowledgeChunk.course_id)
            .where(KnowledgeChunk.embedding.is_not(None), Course.is_published.is_(True)))
    if db.get_bind().dialect.name == "postgresql":
        dist = vector_distance(qvec)
        rows = db.execute(base.add_columns(dist.label("d")).order_by(dist).limit(k * 3)).all()
        scored = [(c, 1 - float(d)) for c, d in rows]
    else:
        scored = [(c, _cosine(qvec, c.embedding)) for c in db.scalars(base).all()]

    # Small boost for the student's own level so explanations match their content.
    boosted = [(c, s + (0.05 if level and c.level == level else 0.0)) for c, s in scored if s >= MIN_SIMILARITY]
    boosted.sort(key=lambda x: x[1], reverse=True)
    return [
        Retrieved(chunk_id=str(c.id), title=c.title, course_id=str(c.course_id) if c.course_id else None,
                  source_id=c.source_id, content=c.content, score=round(s, 3))
        for c, s in boosted[:k]
    ]


def main() -> None:
    from app.db.session import SessionLocal
    from app.services.llm import get_llm

    with SessionLocal() as db:
        print(ingest_lessons(db, get_llm()))


if __name__ == "__main__":
    main()
