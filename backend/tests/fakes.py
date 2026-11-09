"""Deterministic stand-ins for the LLM provider (no network in tests)."""

import hashlib
import json
import math
import re

from app.services.llm import LLMResult

DIM = 2048


def _vec(text: str) -> list[float]:
    v = [0.0] * DIM
    for word in re.findall(r"\w+", text.lower()):
        v[int(hashlib.md5(word.encode()).hexdigest(), 16) % DIM] += 1.0
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


class FakeLLM:
    name = "fake"

    def __init__(self, reply: str = "Here is a step-by-step answer.", blocked: bool = False, quiz: dict | None = None):
        self.reply, self.blocked, self.quiz = reply, blocked, quiz
        self.calls: list[dict] = []
        self.embed_calls = 0

    def generate(self, system, turns, *, json_schema=None, temperature=0.4, max_tokens=2048):
        self.calls.append({"system": system, "turns": turns, "json_schema": json_schema})
        if self.blocked:
            return LLMResult(text="", blocked=True)
        if json_schema is not None:
            return LLMResult(text=json.dumps(self.quiz or {"questions": []}), tokens=50)
        return LLMResult(text=self.reply, tokens=42)

    def embed(self, texts, *, task):
        self.embed_calls += 1
        return [_vec(t) for t in texts]
