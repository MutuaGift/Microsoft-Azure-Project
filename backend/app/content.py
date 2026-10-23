"""Loads the AZ-900 content bank (questions, flashcards, skills outline) once at import time.

The bank is original work mapped to the public AZ-900 skills outline. It is exported from
`legacy-static/js/data.js` by `scripts/export_content.js`, so there is a single source of truth.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_FILE = Path(__file__).parent / "data" / "content.json"


class Content:
    def __init__(self, raw: dict[str, Any]) -> None:
        self.domains: dict[str, dict] = raw["domains"]
        self.skills: dict[str, dict] = raw["skills"]
        self.questions: list[dict] = raw["questions"]
        self.cards: dict[str, list] = raw["cards"]
        self.links: dict[str, str] = raw["links"]
        self.question_by_id = {q["id"]: q for q in self.questions}

    def skills_of(self, domain: str) -> list[str]:
        return [s for s, v in self.skills.items() if v["d"] == domain]

    def public(self) -> dict[str, Any]:
        return {
            "domains": self.domains,
            "skills": self.skills,
            "questions": self.questions,
            "cards": self.cards,
            "links": self.links,
        }


@lru_cache(maxsize=1)
def load_content() -> Content:
    return Content(json.loads(DATA_FILE.read_text(encoding="utf-8")))
