"""Request and response models. Everything the client sends is validated and bounded."""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

MAX_QUESTIONS = 500


class QuestionStat(BaseModel):
    right: int = Field(ge=0, le=10_000)
    wrong: int = Field(ge=0, le=10_000)
    last: bool


Stats = dict[str, QuestionStat]


class StatsBody(BaseModel):
    stats: Stats = Field(default_factory=dict, max_length=MAX_QUESTIONS)
    due_cards: int = Field(default=0, ge=0, le=1000)


class MockBody(BaseModel):
    n: int = Field(default=30, ge=5, le=60)


class PlanBody(BaseModel):
    today: date
    exam: date
    hours: float = Field(ge=0.5, le=12)
    stats: Stats = Field(default_factory=dict, max_length=MAX_QUESTIONS)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1500)


class BuddyBody(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=8)
    lang: str = "English"

    @field_validator("messages")
    @classmethod
    def last_is_user(cls, v: list[ChatMessage]) -> list[ChatMessage]:
        if v[-1].role != "user":
            raise ValueError("the last message must come from the user")
        return v


class ExplainBody(BaseModel):
    question_id: str = Field(max_length=64)
    picked: int = Field(ge=0, le=3, description="index into the question's options array")
    lang: str = "English"
