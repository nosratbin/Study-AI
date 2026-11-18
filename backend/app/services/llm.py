"""LLM providers (REST, server-side keys) and the fallback chain the app uses.

Chat goes through a chain: Groq (fast, free, small per-minute quota per model) -> Gemini -> Z.ai GLM Flash. A provider
that is rate-limited, overloaded, retired or slow hands over to the next one at once. Embeddings always use Gemini,
because the stored pgvector chunks were embedded with it.

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
GROQ_BASE = "https://api.groq.com/openai/v1"
ZAI_BASE = "https://api.z.ai/api/paas/v4"
# Statuses that mean "this model can't serve right now" (overloaded, rate-limited, retired), so try the next one.
FALLBACK_STATUSES = {404, 429, 500, 503}
# An overloaded model sometimes hangs instead of answering 503. Attempts that still have a fallback get this much time
# (capped by AI_TIMEOUT_SECONDS) before the next model is tried; the last model gets the full timeout.
FALLBACK_ATTEMPT_SECONDS = 15.0


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
        self.timeout = timeout
        self._client = httpx.Client(timeout=timeout, headers={"x-goog-api-key": api_key})

    def _post(self, url: str, body: dict, *, allow_fallback: bool = False) -> dict:
        timeout = min(FALLBACK_ATTEMPT_SECONDS, self.timeout) if allow_fallback else self.timeout
        try:
            r = self._client.post(url, json=body, timeout=timeout)
        except httpx.TimeoutException:
            log.warning("gemini timeout after %ss on %s", timeout, url.rsplit("/", 1)[-1])
            if allow_fallback:
                raise _ModelUnavailable(504)
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

    def generate(self, system, turns, *, json_schema=None, temperature=0.4, max_tokens=2048,
                 final: bool = True) -> LLMResult:
        """`final=False` means another provider follows, so even the last Gemini model hands over on failure."""
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
                                  allow_fallback=i < len(models) - 1 or not final)
                break
            except _ModelUnavailable as e:
                last_status = e.status
        else:
            if not final:
                raise _ModelUnavailable(last_status)
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
        return LLMResult(text=text.strip(), tokens=tokens, extra={"finish": cand.get("finishReason"), "model": model})

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


def _json_schema(schema: dict) -> dict:
    """Gemini's OpenAPI-style schema (`"type": "OBJECT"`) as plain JSON Schema, for prompts to other providers."""
    out: dict = {}
    for k, v in schema.items():
        if k == "type" and isinstance(v, str):
            out[k] = v.lower()
        elif k == "properties" and isinstance(v, dict):
            out[k] = {name: _json_schema(sub) for name, sub in v.items()}
        elif k == "items" and isinstance(v, dict):
            out[k] = _json_schema(v)
        else:
            out[k] = v
    return out


class OpenAICompatProvider:
    """Chat-only provider for OpenAI-style APIs (Groq, Z.ai). Each model is tried in turn; a model that is
    rate-limited, overloaded, retired or too slow hands over to the next, and when all fail the chain moves on."""

    def __init__(self, name: str, base_url: str, api_key: str, models: tuple[str, ...], timeout: float):
        self.name = name
        self.base_url = base_url.rstrip("/")
        self.models = models
        self.timeout = timeout
        self._client = httpx.Client(timeout=timeout, headers={"Authorization": f"Bearer {api_key}"})

    @staticmethod
    def _model_params(model: str) -> dict:
        # Keep hidden reasoning short or off: it is slow and counts against max_tokens.
        if model.startswith("openai/gpt-oss"):
            return {"reasoning_effort": "low"}
        if model.startswith("qwen/qwen3"):
            return {"reasoning_effort": "none"}
        if model.startswith("glm-"):
            return {"thinking": {"type": "disabled"}}
        return {}

    def generate(self, system, turns, *, json_schema=None, temperature=0.4, max_tokens=2048,
                 final: bool = True) -> LLMResult:
        if json_schema:
            system = (f"{system}\n\nRespond with only a JSON object (no prose, no code fences) that matches this "
                      f"JSON schema:\n{json.dumps(_json_schema(json_schema))}")
        messages = [{"role": "system", "content": system}, *({"role": t.role, "content": t.content} for t in turns)]
        last_status = 0
        for i, model in enumerate(self.models):
            handover = i < len(self.models) - 1 or not final
            body = {"model": model, "messages": messages, "temperature": temperature, "max_tokens": max_tokens,
                    **self._model_params(model)}
            if json_schema:
                body["response_format"] = {"type": "json_object"}
            timeout = min(FALLBACK_ATTEMPT_SECONDS, self.timeout) if handover else self.timeout
            try:
                r = self._client.post(f"{self.base_url}/chat/completions", json=body, timeout=timeout)
            except httpx.TimeoutException:
                log.warning("%s timeout after %ss on %s", self.name, timeout, model)
                last_status = 504
                if handover:
                    continue
                raise ApiError(504, "ai_timeout", "The AI tutor took too long to respond. Please try again.")
            except httpx.HTTPError:
                last_status = 502
                if handover:
                    continue
                raise ApiError(502, "ai_unavailable", "The AI service is unreachable right now. Please try again.")
            if r.status_code >= 400:
                # Log status + the provider's message only (never the request, which may contain student text).
                try:
                    msg = str((r.json().get("error") or {}).get("message", ""))[:300]
                except ValueError:
                    msg = r.text[:200]
                log.warning("%s error %s on %s: %s", self.name, r.status_code, model, msg)
                last_status = r.status_code
                # Any error hands over, including 401/402: a bad key or unpaid model on one provider must not stop
                # the chain.
                if handover:
                    continue
                if r.status_code in (429, 503):
                    raise ApiError(503, "ai_busy", "The AI service is busy right now. Please try again in a minute.")
                raise ApiError(502, "ai_unavailable", "The AI service returned an error. Please try again.")
            data = r.json()
            choice = (data.get("choices") or [{}])[0]
            if choice.get("finish_reason") == "content_filter":
                return LLMResult(text="", blocked=True, extra={"model": model})
            text = ((choice.get("message") or {}).get("content") or "").strip()
            if not text:
                log.warning("%s returned no text on %s (finish=%s)", self.name, model, choice.get("finish_reason"))
                last_status = 502
                if handover:
                    continue
                raise ApiError(502, "ai_empty", "The AI didn't produce an answer. Please try again or rephrase.")
            tokens = (data.get("usage") or {}).get("total_tokens")
            return LLMResult(text=text, tokens=tokens, extra={"finish": choice.get("finish_reason"), "model": model})
        raise _ModelUnavailable(last_status)

    def embed(self, texts, *, task) -> list[list[float]]:  # pragma: no cover - chat only
        raise NotImplementedError(f"{self.name} is used for chat only")


class ChainProvider:
    """Tries chat providers in order; embeddings always go to Gemini."""

    name = "chain"

    def __init__(self, chat: list, embedder: GeminiProvider):
        self.chat = chat
        self.embedder = embedder

    def generate(self, system, turns, *, json_schema=None, temperature=0.4, max_tokens=2048) -> LLMResult:
        last_status = 0
        for i, provider in enumerate(self.chat):
            try:
                return provider.generate(system, turns, json_schema=json_schema, temperature=temperature,
                                         max_tokens=max_tokens, final=i == len(self.chat) - 1)
            except _ModelUnavailable as e:
                last_status = e.status
                log.info("%s unavailable (%s), trying the next provider", provider.name, e.status)
        raise ApiError(503 if last_status in (429, 503) else 502, "ai_busy",  # pragma: no cover - last raises
                       "The AI service is busy right now. Please try again in a minute.")

    def embed(self, texts, *, task) -> list[list[float]]:
        return self.embedder.embed(texts, task=task)


def _models(csv: str) -> tuple[str, ...]:
    return tuple(m.strip() for m in csv.split(",") if m.strip())


_provider: LLMProvider | None = None


def get_llm() -> LLMProvider:
    """FastAPI dependency. Raises 503 when no provider is configured."""
    global _provider
    s = get_settings()
    if not s.ai_enabled:
        raise ApiError(503, "ai_not_configured", "The AI Tutor is not configured on this server yet (GEMINI_API_KEY missing).")
    if _provider is None:
        gemini = GeminiProvider(s.gemini_api_key, s.gemini_model, s.gemini_embedding_model, s.embedding_dim,
                                s.ai_timeout_seconds, _models(s.gemini_fallback_models))
        chat: list = []
        if s.groq_api_key and _models(s.groq_models):
            chat.append(OpenAICompatProvider("groq", GROQ_BASE, s.groq_api_key, _models(s.groq_models),
                                             s.ai_timeout_seconds))
        chat.append(gemini)
        if s.zai_api_key and _models(s.zai_models):
            chat.append(OpenAICompatProvider("zai", ZAI_BASE, s.zai_api_key, _models(s.zai_models),
                                             s.ai_timeout_seconds))
        _provider = ChainProvider(chat, gemini) if len(chat) > 1 else gemini
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
