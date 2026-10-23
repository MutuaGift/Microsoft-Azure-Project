"""AI Study Buddy: prompts, a small Claude client, and a per-client rate limiter.

The API key lives only on the server (ANTHROPIC_API_KEY). The browser never sees it.
Prompt design and the evaluation checklist are documented in docs/PROMPTS.md.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Protocol

import httpx

from .content import Content

ENDPOINT = "https://api.anthropic.com/v1/messages"
LANGUAGES = ["English", "Kiswahili", "Français", "Hausa", "Yorùbá", "isiZulu", "Amharic (አማርኛ)", "Português"]


def system_prompt(lang: str) -> str:
    return "\n".join([
        "You are AZ-900 Study Buddy, an unofficial, friendly tutor for people preparing for the Microsoft Azure Fundamentals (AZ-900) exam. Many learners are beginners in Africa studying on phones with limited data.",
        "",
        "SCOPE",
        "- Only help with topics on the public AZ-900 skills outline: cloud concepts, Azure architecture and services, Azure management and governance.",
        "- If asked about anything else, say so kindly in one sentence and offer an AZ-900 topic instead.",
        "",
        "HOW TO ANSWER (keep it under 170 words)",
        "1. One-sentence plain-language definition. No jargon without explaining it.",
        "2. A short analogy from everyday life in Africa (for example mobile money, matatus and boda-bodas, market stalls, load-shedding, chamas, airtime, shared kitchens). Vary them, and never stereotype.",
        "3. 'Exam tip': the one distinction the exam usually tests (for example IaaS vs PaaS, LRS vs GRS, Policy vs RBAC).",
        "4. If the learner is reviewing a quiz question, say why the correct option is right and, briefly, why each wrong option fails.",
        "",
        "RULES",
        "- Be accurate. If you are not sure, say so and point to Microsoft Learn rather than guessing. Prices, limits and preview features change.",
        "- Never reproduce or guess real exam questions. Never claim to be from Microsoft or to be official.",
        "- Keep Azure product names and technical terms in English (for example 'Availability Zone'), even when you write in another language.",
        f"- Reply in {lang}. If you are less confident in that language, keep sentences short and simple.",
        "- Use at most one short list. No headings. Friendly, encouraging tone.",
    ])


def explain_prompt(q: dict, picked: int) -> str:
    opts = " | ".join(f"{'ABCD'[i]}) {t}" for i, t in enumerate(q["o"]))
    ok = picked == q["a"]
    return "\n".join([
        "I am reviewing this practice question from a study app.",
        f"Question: {q['q']}",
        f"Options: {opts}",
        f"Correct answer: {q['o'][q['a']]}",
        f"I chose: {q['o'][picked]}{' (correct)' if ok else ' (wrong)'}",
        "Explain the concept in a way I will remember, and tell me why the other options are not right.",
    ])


class ChatClient(Protocol):
    async def complete(self, system: str, messages: list[dict]) -> str: ...


class ClaudeError(Exception):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status


class ClaudeClient:
    def __init__(self, api_key: str, model: str, timeout: float = 30.0) -> None:
        self.api_key, self.model, self.timeout = api_key, model, timeout

    async def complete(self, system: str, messages: list[dict]) -> str:
        headers = {"x-api-key": self.api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        body = {"model": self.model, "max_tokens": 700, "system": system, "messages": messages}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(ENDPOINT, headers=headers, json=body)
        except httpx.HTTPError as exc:
            raise ClaudeError(502, "Could not reach the AI service") from exc
        if res.status_code != 200:
            raise ClaudeError(502, "The AI service returned an error")
        parts = res.json().get("content", [])
        return "\n".join(p.get("text", "") for p in parts if p.get("type") == "text").strip()


class RateLimiter:
    """Sliding-window limiter, per client key. In-memory: fine for one instance."""

    def __init__(self, limit: int = 20, window: float = 60.0) -> None:
        self.limit, self.window = limit, window
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        q = self.hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        return True


def find_question(content: Content, qid: str) -> dict | None:
    return content.question_by_id.get(qid)
