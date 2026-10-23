"""FastAPI application: content, analytics, mock exams, study planner and the AI Buddy proxy.

Progress is stored on the learner's device. The server is stateless: the client sends its stats
and gets analytics back, so there are no accounts and nothing personal to protect or delete.
"""
from __future__ import annotations

import os
import random
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import analytics as an
from .buddy import (LANGUAGES, ChatClient, ClaudeClient, ClaudeError, RateLimiter, explain_prompt, find_question,
                    system_prompt)
from .content import Content, load_content
from .mock import build_mock
from .planner import build_plan
from .schemas import BuddyBody, ExplainBody, MockBody, PlanBody, StatsBody

DEFAULT_MODEL = "claude-haiku-5-5"


def create_app(content: Content | None = None, chat: ChatClient | None = None, limiter: RateLimiter | None = None,
               dist: Path | None = None) -> FastAPI:
    content = content or load_content()
    if chat is None and os.getenv("ANTHROPIC_API_KEY"):
        chat = ClaudeClient(os.environ["ANTHROPIC_API_KEY"], os.getenv("ANTHROPIC_MODEL", DEFAULT_MODEL))
    limiter = limiter or RateLimiter(int(os.getenv("BUDDY_RATE_LIMIT_PER_MIN", "20")))

    app = FastAPI(title="AZ-900 Prep Buddy API (unofficial)", version="1.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
    origins = [o for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o]
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["content-type"])

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        res = await call_next(request)
        res.headers.setdefault("X-Content-Type-Options", "nosniff")
        res.headers.setdefault("Referrer-Policy", "no-referrer")
        return res

    @app.get("/api/health")
    def health() -> dict:
        return {"status": "ok", "buddy": chat is not None, "questions": len(content.questions)}

    @app.get("/api/content")
    def get_content() -> dict:
        return content.public()

    @app.post("/api/analytics")
    def post_analytics(body: StatsBody) -> dict:
        return an.analytics(body.stats, content, body.due_cards)

    @app.post("/api/mock")
    def post_mock(body: MockBody) -> dict:
        return {"ids": build_mock(body.n, content, random.Random())}

    @app.post("/api/plan")
    def post_plan(body: PlanBody) -> dict:
        plan = build_plan(body.today, body.exam, body.hours, body.stats, content)
        if plan.get("error"):
            raise HTTPException(422, "The exam date is in the past")
        return plan

    def guard(request: Request, lang: str) -> ChatClient:
        if lang not in LANGUAGES:
            raise HTTPException(422, "Unsupported language")
        if chat is None:
            raise HTTPException(503, "The AI Buddy is not configured on this server")
        client = request.client.host if request.client else "unknown"
        if not limiter.allow(client):
            raise HTTPException(429, "Too many questions. Please wait a minute.")
        return chat

    async def run(client: ChatClient, lang: str, messages: list[dict]) -> dict:
        try:
            return {"reply": await client.complete(system_prompt(lang), messages)}
        except ClaudeError as exc:
            raise HTTPException(exc.status, str(exc)) from exc

    @app.post("/api/buddy")
    async def post_buddy(body: BuddyBody, request: Request) -> dict:
        client = guard(request, body.lang)
        return await run(client, body.lang, [m.model_dump() for m in body.messages])

    @app.post("/api/explain")
    async def post_explain(body: ExplainBody, request: Request) -> dict:
        client = guard(request, body.lang)
        q = find_question(content, body.question_id)
        if q is None:
            raise HTTPException(404, "Unknown question")
        return await run(client, body.lang, [{"role": "user", "content": explain_prompt(q, body.picked)}])

    # Serve the built React app from the same origin in production.
    dist = dist or Path(os.getenv("FRONTEND_DIST", Path(__file__).resolve().parents[2] / "frontend" / "dist"))
    if dist.is_dir():
        app.mount("/", StaticFiles(directory=dist, html=True), name="web")
    return app


app = create_app()
