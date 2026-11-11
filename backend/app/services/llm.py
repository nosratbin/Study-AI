"""LLM provider abstraction with a Gemini implementation (REST, server-side key).

Swap providers by implementing `LLMProvider` and returning it from `get_llm()`.
Tests override `get_llm` via FastAPI dependency overrides.
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Literal, Protocol

import httpx

from app.core.config import get_settings
from app.core.errors import ApiError

log = logging.getLogger("iccheghuri.llm")

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
# Statuses that mean "this model can't serve right now" (overloaded, rate-limited, retired), so try the next one.
FALLBACK_STATUSES = {404, 429, 500, 503}


class _ModelUnavailable(Exception):
    def __init__(self, status: int):
        self.status = status


@dataclass
class ChatTurn:
    role: Literal["user", "assistant"]
    content: str


@dataclass
class LLMResult:
    text: str
    tokens: int | None = None
    blocked: bool = False
    extra: dict = field(default_factory=dict)


class LLMProvider(Protocol):
    name: str

    def generate(self, system: str, turns: list[ChatTurn], *, json_schema: dict | None = None,
                 temperature: float = 0.4, max_tokens: int = 2048) -> LLMResult: ...

    def embed(self, texts: list[str], *, task: Literal["document", "query"]) -> list[list[float]]: ...


class GeminiProvider:
    name = "gemini"

    def __init__(self, api_key: str, model: str, embedding_model: str, dim: int, timeout: float,
                 fallback_models: tuple[str, ...] = ()):
        self.model = model
        self.fallback_models = tuple(m for m in fallback_models if m and m != model)
        self.embedding_model = embedding_model
        self.dim = dim
        self._client = httpx.Client(timeout=timeout, headers={"x-goog-api-key": api_key})

    def _post(self, url: str, body: dict, *, allow_fallback: bool = False) -> dict:
        try:
            r = self._client.post(url, json=body)
        except httpx.TimeoutException:
            raise ApiError(504, "ai_timeout", "The AI tutor took too long to respond. Please try again.")
        except httpx.HTTPError:
            raise ApiError(502, "ai_unavailable", "The AI service is unreachable right now. Please try again.")
        if r.status_code >= 400:
            # Log status + Google's error message only (never the request, which may contain student text).
            try:
                msg = r.json().get("error", {}).get("message", "")[:300]
            except ValueError:
                msg = r.text[:200]
            log.warning("gemini error %s on %s: %s", r.status_code, url.rsplit("/", 1)[-1], msg)
            if allow_fallback and r.status_code in FALLBACK_STATUSES:
                raise _ModelUnavailable(r.status_code)
            if r.status_code in (429, 503):
                raise ApiError(503, "ai_busy", "The AI service is busy right now. Please try again in a minute.")
            raise ApiError(502, "ai_unavailable", "The AI service returned an error. Please try again.")
        return r.json()

    @staticmethod
    def _thinking(model: str) -> dict:
        # Thinking tokens count against maxOutputTokens; keep them small so answers aren't cut off.
        # Gemini 2.5 takes a token budget; Gemini 3+ takes a level.
        if model.startswith("gemini-2.5"):
            return {"thinkingBudget": 512}
        return {"thinkingLevel": "low"}

    def generate(self, system, turns, *, json_schema=None, temperature=0.4, max_tokens=2048) -> LLMResult:
        base_config: dict = {"temperature": temperature, "maxOutputTokens": max_tokens}
        if json_schema:
            base_config["responseMimeType"] = "application/json"
            base_config["responseSchema"] = json_schema
        body: dict = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [
                {"role": "user" if t.role == "user" else "model", "parts": [{"text": t.content}]} for t in turns
            ],
        }
        models = (self.model, *self.fallback_models)
        last_status = 0
        for i, model in enumerate(models):
            body["generationConfig"] = {**base_config, "thinkingConfig": self._thinking(model)}
            try:
                data = self._post(f"{GEMINI_BASE}/models/{model}:generateContent", body,
                                  allow_fallback=i < len(models) - 1)
                break
            except _ModelUnavailable as e:
                last_status = e.status
        else:  # pragma: no cover - the last model raises ApiError instead of _ModelUnavailable
            raise ApiError(503 if last_status in (429, 503) else 502, "ai_busy", "The AI service is busy right now.")

        if data.get("promptFeedback", {}).get("blockReason"):
            return LLMResult(text="", blocked=True)
        cands = data.get("candidates") or []
        if not cands:
            return LLMResult(text="", blocked=True)
        cand = cands[0]
        if cand.get("finishReason") in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"):
            return LLMResult(text="", blocked=True)
        text = "".join(p.get("text", "") for p in cand.get("content", {}).get("parts", []) if not p.get("thought"))
        tokens = (data.get("usageMetadata") or {}).get("totalTokenCount")
        if not text.strip():
            log.warning("gemini returned no text (finish=%s)", cand.get("finishReason"))
            raise ApiError(502, "ai_empty", "The AI didn't produce an answer. Please try again or rephrase.")
        return LLMResult(text=text.strip(), tokens=tokens, extra={"finish": cand.get("finishReason")})

    def embed(self, texts, *, task) -> list[list[float]]:
        task_type = "RETRIEVAL_DOCUMENT" if task == "document" else "RETRIEVAL_QUERY"
        out: list[list[float]] = []
        for i in range(0, len(texts), 50):
            batch = texts[i : i + 50]
            body = {
                "requests": [
                    {
                        "model": f"models/{self.embedding_model}",
                        "content": {"parts": [{"text": t}]},
                        "taskType": task_type,
                        "outputDimensionality": self.dim,
                    }
                    for t in batch
                ]
            }
            data = self._post(f"{GEMINI_BASE}/models/{self.embedding_model}:batchEmbedContents", body)
            out.extend(e["values"] for e in data.get("embeddings", []))
        if len(out) != len(texts):
            raise ApiError(502, "ai_unavailable", "Embedding service returned an unexpected response.")
        return out


_provider: LLMProvider | None = None


def get_llm() -> LLMProvider:
    """FastAPI dependency. Raises 503 when no provider is configured."""
    global _provider
    s = get_settings()
    if not s.ai_enabled:
        raise ApiError(503, "ai_not_configured", "The AI Tutor is not configured on this server yet (GEMINI_API_KEY missing).")
    if _provider is None:
        fallbacks = tuple(m.strip() for m in s.gemini_fallback_models.split(",") if m.strip())
        _provider = GeminiProvider(s.gemini_api_key, s.gemini_model, s.gemini_embedding_model, s.embedding_dim,
                                   s.ai_timeout_seconds, fallbacks)
    return _provider


def parse_json(text: str) -> dict | list:
    """Parse model JSON output, tolerating ```json fences."""
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t
        t = t.rsplit("```", 1)[0]
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        raise ApiError(502, "ai_bad_output", "The AI returned an unexpected format. Please try again.")
