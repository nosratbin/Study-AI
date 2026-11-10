"""GeminiProvider request shape and model fallback (no network: httpx.MockTransport)."""

import json

import httpx
import pytest

from app.core.errors import ApiError
from app.services.llm import ChatTurn, GeminiProvider


def provider(handler, model="gemini-3.5-flash", fallbacks=("gemini-flash-latest",)):
    p = GeminiProvider("k", model, "gemini-embedding-001", 768, 5, fallbacks)
    p._client = httpx.Client(transport=httpx.MockTransport(handler))
    return p


def ok(text="hi"):
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": text}]}, "finishReason": "STOP"}]})


def test_falls_back_when_primary_is_overloaded():
    calls = []

    def handler(req):
        model = req.url.path.rsplit("/", 1)[-1].split(":")[0]
        calls.append((model, json.loads(req.content)["generationConfig"]["thinkingConfig"]))
        return httpx.Response(503, json={"error": {"message": "high demand"}}) if model == "gemini-3.5-flash" else ok("from fallback")

    r = provider(handler).generate("sys", [ChatTurn("user", "q")])
    assert r.text == "from fallback"
    assert [m for m, _ in calls] == ["gemini-3.5-flash", "gemini-flash-latest"]
    assert calls[0][1] == {"thinkingLevel": "low"}


def test_gemini_25_uses_thinking_budget():
    seen = {}

    def handler(req):
        seen.update(json.loads(req.content)["generationConfig"])
        return ok()

    provider(handler, model="gemini-2.5-flash", fallbacks=()).generate("s", [ChatTurn("user", "q")])
    assert seen["thinkingConfig"] == {"thinkingBudget": 512}


def test_all_models_busy_is_503_and_bad_request_does_not_fall_back():
    p = provider(lambda req: httpx.Response(503, json={"error": {"message": "busy"}}))
    with pytest.raises(ApiError) as e:
        p.generate("s", [ChatTurn("user", "q")])
    assert (e.value.status, e.value.code) == (503, "ai_busy")

    calls = []

    def bad(req):
        calls.append(1)
        return httpx.Response(400, json={"error": {"message": "bad"}})

    with pytest.raises(ApiError) as e:
        provider(bad).generate("s", [ChatTurn("user", "q")])
    assert e.value.status == 502 and len(calls) == 1
