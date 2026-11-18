"""The chat fallback chain: Groq models -> Gemini -> Z.ai, with Gemini always doing embeddings."""

import json

import httpx
import pytest

from app.core.errors import ApiError
from app.services.llm import ChainProvider, ChatTurn, GeminiProvider, OpenAICompatProvider, _json_schema
from app.services.tutor import QUIZ_SCHEMA

TURNS = [ChatTurn("user", "What is ML?")]


def _openai_ok(model: str, text: str = "answer") -> httpx.Response:
    return httpx.Response(200, json={"choices": [{"message": {"content": text}, "finish_reason": "stop"}],
                                     "usage": {"total_tokens": 10}, "model": model})


def _gemini_ok(text: str = "gemini answer") -> httpx.Response:
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": text}]}, "finishReason": "STOP"}],
                                     "usageMetadata": {"totalTokenCount": 7}})


def _compat(name: str, models: tuple[str, ...], handler) -> OpenAICompatProvider:
    p = OpenAICompatProvider(name, "https://example.test/v1", "k", models, 30)
    p._client = httpx.Client(transport=httpx.MockTransport(handler))
    return p


def _gemini(handler) -> GeminiProvider:
    g = GeminiProvider("k", "gemini-main", "emb", 768, 30)
    g._client = httpx.Client(transport=httpx.MockTransport(handler))
    return g


def test_rate_limited_groq_model_hands_over_to_the_next_model():
    seen: list[str] = []

    def groq(req: httpx.Request):
        body = json.loads(req.content)
        seen.append(body["model"])
        if body["model"] == "openai/gpt-oss-120b":
            assert body["reasoning_effort"] == "low"
            return httpx.Response(429, json={"error": {"message": "Rate limit reached"}})
        assert body["reasoning_effort"] == "none"
        return _openai_ok(body["model"], "from qwen")

    chain = ChainProvider([_compat("groq", ("openai/gpt-oss-120b", "qwen/qwen3.8-27b"), groq),
                           _gemini(lambda r: pytest.fail("Gemini should not be called"))], _gemini(_gemini_ok))
    res = chain.generate("system", TURNS)
    assert res.text == "from qwen" and res.extra["model"] == "qwen/qwen3.8-27b"
    assert seen == ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"]


def test_all_groq_models_failing_falls_back_to_gemini_then_zai():
    groq = _compat("groq", ("a", "b"), lambda r: httpx.Response(401, json={"error": {"message": "Invalid API Key"}}))
    gemini_down = _gemini(lambda r: httpx.Response(503, json={"error": {"message": "overloaded"}}))

    def zai(req: httpx.Request):
        body = json.loads(req.content)
        assert body["thinking"] == {"type": "disabled"}
        return _openai_ok(body["model"], "from glm")

    assert ChainProvider([groq, _gemini(lambda r: _gemini_ok()), gemini_down], None).generate("s", TURNS).text == "gemini answer"
    res = ChainProvider([groq, gemini_down, _compat("zai", ("glm-4.5-flash",), zai)], None).generate("s", TURNS)
    assert res.text == "from glm"


def test_last_provider_failing_raises_a_friendly_error():
    groq = _compat("groq", ("a",), lambda r: httpx.Response(429, json={"error": {"message": "Rate limit"}}))
    gemini = _gemini(lambda r: httpx.Response(429, json={"error": {"message": "quota"}}))
    with pytest.raises(ApiError) as e:
        ChainProvider([groq, gemini], gemini).generate("s", TURNS)
    assert e.value.code == "ai_busy"


def test_json_requests_send_the_schema_and_json_mode():
    def groq(req: httpx.Request):
        body = json.loads(req.content)
        assert body["response_format"] == {"type": "json_object"}
        system = body["messages"][0]["content"]
        assert '"type": "object"' in system and '"correct_option": {"type": "integer"}' in system
        return _openai_ok(body["model"], '{"questions": []}')

    chain = ChainProvider([_compat("groq", ("openai/gpt-oss-120b",), groq), _gemini(_gemini_ok)], None)
    assert json.loads(chain.generate("quiz", TURNS, json_schema=QUIZ_SCHEMA).text) == {"questions": []}
    assert _json_schema(QUIZ_SCHEMA)["properties"]["questions"]["items"]["type"] == "object"


def test_embeddings_always_use_gemini():
    def gemini(req: httpx.Request):
        assert req.url.path.endswith(":batchEmbedContents")
        return httpx.Response(200, json={"embeddings": [{"values": [0.1, 0.2]}]})

    chain = ChainProvider([_compat("groq", ("a",), lambda r: pytest.fail("no chat call"))], _gemini(gemini))
    assert chain.embed(["text"], task="query") == [[0.1, 0.2]]
