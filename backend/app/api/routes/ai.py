"""AI Smart Tutor: chat with history + RAG, conversation management, practice quiz generation.

The LLM never produces official scores: generated quizzes are practice-only and are
never stored as assessment results.
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy import delete, func, select

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.core.rate_limit import limiter
from app.db.base import utcnow
from app.models import AIConversation, AIMessage, Course, Lesson, User
from app.models.enums import ChatRole, Language
from app.schemas.learning import (
    AIStatusOut,
    ChatIn,
    ChatOut,
    ConversationOut,
    MessageOut,
    PracticeQuestion,
    QuizIn,
    QuizOut,
    SourceOut,
)
from app.services.llm import ChatTurn, LLMProvider, get_llm, parse_json
from app.services.rag import retrieve
from app.services.tutor import QUIZ_SCHEMA, detect_language, quiz_prompt, system_prompt, title_from

router = APIRouter(prefix="/ai", tags=["ai-tutor"])
LLM = Annotated[LLMProvider, Depends(get_llm)]
QUIZZES_PER_DAY = 30

BLOCKED_REPLY = {
    Language.en: "I can't help with that request. If something is worrying you, please talk to a parent, teacher or "
                 "someone you trust — and in an emergency in Bangladesh, call 999. I'm happy to help with your studies!",
    Language.bn: "এই অনুরোধে আমি সাহায্য করতে পারছি না। কোনো কিছু নিয়ে চিন্তিত থাকলে বাবা-মা, শিক্ষক বা বিশ্বস্ত কারো সাথে কথা বলো — "
                 "জরুরি প্রয়োজনে বাংলাদেশে ৯৯৯ নম্বরে ফোন করো। পড়াশোনায় সাহায্য করতে আমি সবসময় আছি!",
}


def _used_today(db, user_id: uuid.UUID) -> int:
    since = datetime.now(UTC) - timedelta(days=1)
    return db.scalar(
        select(func.count(AIMessage.id)).join(AIConversation, AIConversation.id == AIMessage.conversation_id)
        .where(AIConversation.user_id == user_id, AIMessage.role == ChatRole.user, AIMessage.created_at >= since)
    ) or 0


def _check_limits(db, user: User) -> None:
    s = get_settings()
    if _used_today(db, user.id) >= s.ai_messages_per_day:
        raise ApiError(429, "ai_daily_limit", "You've reached today's AI Tutor limit. Please come back tomorrow.")
    wait = limiter.hit(f"ai:{user.id}", s.ai_messages_per_minute, 60)
    if wait is not None:
        raise ApiError(429, "rate_limited", "You're sending messages quickly. Please wait a moment.",
                       headers={"Retry-After": str(int(wait) + 1)})


def _own_conversation(db, user: User, conversation_id: uuid.UUID) -> AIConversation:
    conv = db.get(AIConversation, conversation_id)
    if not conv or conv.user_id != user.id:
        raise ApiError(404, "conversation_not_found", "Conversation not found.")
    return conv


def _conv_out(c: AIConversation) -> ConversationOut:
    return ConversationOut(id=str(c.id), title=c.title, language=c.language, updated_at=c.updated_at)


def _msg_out(m: AIMessage) -> MessageOut:
    return MessageOut(id=str(m.id), role=m.role.value, content=m.content,
                      sources=[SourceOut(**s) for s in (m.sources or [])], created_at=m.created_at)


def _language(user: User, requested: str, text: str) -> Language:
    preferred = user.student_profile.preferred_language if user.student_profile else Language.en
    if requested != "auto":
        return Language(requested)
    return detect_language(text, preferred)


@router.get("/status", response_model=AIStatusOut)
def status(user: CurrentUser, db: DbSession):
    s = get_settings()
    return AIStatusOut(configured=s.ai_enabled, daily_limit=s.ai_messages_per_day, used_today=_used_today(db, user.id))


@router.post("/chat", response_model=ChatOut)
def chat(body: ChatIn, user: CurrentUser, db: DbSession, llm: LLM):
    s = get_settings()
    conv = _own_conversation(db, user, body.conversation_id) if body.conversation_id else None
    lesson = None
    if body.lesson_id:
        lesson = db.get(Lesson, body.lesson_id)
        if not lesson or not lesson.course.is_published:
            raise ApiError(404, "lesson_not_found", "Lesson not found.")
    _check_limits(db, user)

    profile = user.student_profile
    level = profile.education_level if profile else None
    is_minor = bool(profile and profile.is_minor)
    language = _language(user, body.language, body.message)

    history: list[ChatTurn] = []
    if conv:
        recent = db.scalars(
            select(AIMessage).where(AIMessage.conversation_id == conv.id)
            .order_by(AIMessage.created_at.desc()).limit(s.ai_history_messages)
        ).all()
        history = [ChatTurn(role=m.role.value, content=m.content) for m in reversed(recent)]

    sources = retrieve(db, llm, body.message, level)
    prompt = system_prompt(level, language, is_minor, sources,
                           lesson_context=f"{lesson.title}\n\n{lesson.content_md}" if lesson else None)
    result = llm.generate(prompt, [*history, ChatTurn(role="user", content=body.message)])
    reply = BLOCKED_REPLY[language] if result.blocked else result.text

    slugs = dict(db.execute(select(Course.id, Course.slug).where(
        Course.id.in_({uuid.UUID(r.course_id) for r in sources if r.course_id}))).all()) if sources else {}
    seen, source_out = set(), []
    for r in sources:
        if r.source_id in seen:
            continue
        seen.add(r.source_id)
        source_out.append({"title": r.title, "lesson_id": r.source_id,
                           "course_slug": slugs.get(uuid.UUID(r.course_id)) if r.course_id else None})

    if conv is None:
        conv = AIConversation(user_id=user.id, title=title_from(body.message), language=language,
                              course_id=lesson.course_id if lesson else None)
        db.add(conv)
        db.flush()
    else:
        conv.language = language
        conv.updated_at = utcnow()
    now = utcnow()
    user_msg = AIMessage(conversation_id=conv.id, role=ChatRole.user, content=body.message, sources=[], created_at=now)
    bot_msg = AIMessage(conversation_id=conv.id, role=ChatRole.assistant, content=reply, tokens=result.tokens,
                        sources=[] if result.blocked else source_out, created_at=now + timedelta(microseconds=1))
    db.add_all([user_msg, bot_msg])
    db.commit()
    return ChatOut(conversation=_conv_out(conv), user_message=_msg_out(user_msg), assistant_message=_msg_out(bot_msg))


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(user: CurrentUser, db: DbSession):
    convs = db.scalars(select(AIConversation).where(AIConversation.user_id == user.id)
                       .order_by(AIConversation.updated_at.desc()).limit(50)).all()
    return [_conv_out(c) for c in convs]


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def conversation_messages(conversation_id: uuid.UUID, user: CurrentUser, db: DbSession):
    conv = _own_conversation(db, user, conversation_id)
    msgs = db.scalars(select(AIMessage).where(AIMessage.conversation_id == conv.id)
                      .order_by(AIMessage.created_at).limit(500)).all()
    return [_msg_out(m) for m in msgs]


@router.delete("/conversations/{conversation_id}", status_code=204, response_class=Response)
def delete_conversation(conversation_id: uuid.UUID, user: CurrentUser, db: DbSession):
    conv = _own_conversation(db, user, conversation_id)
    db.execute(delete(AIMessage).where(AIMessage.conversation_id == conv.id))
    db.delete(conv)
    db.commit()
    return Response(status_code=204)


@router.post("/quiz", response_model=QuizOut)
def generate_quiz(body: QuizIn, user: CurrentUser, db: DbSession, llm: LLM):
    _check_limits(db, user)
    if limiter.hit(f"ai-quiz-day:{user.id}", QUIZZES_PER_DAY, 86400) is not None:
        raise ApiError(429, "ai_daily_limit", "You've reached today's practice quiz limit. Please come back tomorrow.")
    profile = user.student_profile
    level = profile.education_level if profile else None
    language = _language(user, body.language, body.topic)
    result = llm.generate(quiz_prompt(level, language, body.count), [ChatTurn(role="user", content=body.topic)],
                          json_schema=QUIZ_SCHEMA, temperature=0.3, max_tokens=4096)
    if result.blocked:
        raise ApiError(422, "ai_blocked", "I can't make a quiz on that topic. Try a study topic like 'Python loops'.")
    data = parse_json(result.text)
    raw = data.get("questions", []) if isinstance(data, dict) else []
    questions: list[PracticeQuestion] = []
    for q in raw:
        try:
            options = [str(o).strip() for o in q["options"]]
            correct = int(q["correct_option"])
            if len(options) != 4 or not all(options) or len(set(options)) != 4 or not 0 <= correct < 4:
                continue
            questions.append(PracticeQuestion(prompt=str(q["prompt"]).strip(), options=options, correct_option=correct,
                                              explanation=str(q.get("explanation", "")).strip()))
        except (KeyError, TypeError, ValueError):
            continue
    if not questions:
        raise ApiError(502, "ai_bad_output", "The AI couldn't make a valid quiz. Please try again.")
    notice = ("AI-generated practice questions. They can contain mistakes and are not an official score."
              if language == Language.en else
              "এগুলো AI-তৈরি অনুশীলনী প্রশ্ন। এতে ভুল থাকতে পারে, এবং এটি কোনো অফিসিয়াল স্কোর নয়।")
    return QuizOut(topic=body.topic, questions=questions[: body.count], notice=notice)
