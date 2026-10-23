"""Study planner: weakness-weighted, interleaved, ending with a mock exam and a light review day."""
from __future__ import annotations

from datetime import date
from typing import Any

from .analytics import skill_report
from .content import Content
from .mock import allocate
from .schemas import Stats


def build_plan(today: date, exam: date, hours: float, stats: Stats, content: Content) -> dict[str, Any]:
    n = (exam - today).days
    if n < 0:
        return {"error": "past"}
    if n == 0:
        return {"exam_day": True, "days": []}

    sk = skill_report(stats, content)
    review_day = n - 1 if n >= 3 else -1
    mock_day = n - 2 if n >= 5 else -1
    study_days = n - (review_day >= 0) - (mock_day >= 0)

    ids = list(content.skills)
    per_domain: dict[str, int] = {}
    for s in ids:
        per_domain[content.skills[s]["d"]] = per_domain.get(content.skills[s]["d"], 0) + 1
    need = {s: content.domains[content.skills[s]["d"]]["weight"] / per_domain[content.skills[s]["d"]] * (1.1 - sk[s]["mastery"])
            for s in ids}

    # Pick the skills that fit, give each one day, then spread the remaining days by need.
    chosen = sorted(ids, key=lambda s: -need[s])[: max(1, min(len(ids), study_days))]
    counts = {s: 1 for s in chosen}
    extra = study_days - len(chosen)
    if extra > 0:
        for s, add in zip(chosen, allocate(extra, [need[s] for s in chosen])):
            counts[s] += add

    # Interleave: take the skill with the most days left, never the same one twice in a row.
    seq: list[str] = []
    last = None
    for _ in range(study_days):
        live = [s for s in chosen if counts[s] > 0]
        pool = [s for s in live if s != last] or live
        pick = sorted(pool, key=lambda s: (-counts[s], -need[s]))[0]
        seq.append(pick)
        counts[pick] -= 1
        last = pick

    mins = round(hours * 60)
    days: list[dict[str, Any]] = []
    k = 0
    for d in range(n):
        if d == review_day:
            days.append({"kind": "review", "mins": {"cards": min(mins, 60)}})
        elif d == mock_day:
            days.append({"kind": "mock", "mins": {"mock": min(mins, 45), "review": max(0, mins - 45)}})
        else:
            days.append({"kind": "study", "skill": seq[k],
                         "mins": {"learn": round(mins * 0.5), "quiz": round(mins * 0.3), "cards": round(mins * 0.2)}})
            k += 1
    share: dict[str, int] = {}
    for s in seq:
        share[s] = share.get(s, 0) + 1
    return {"n": n, "total_minutes": n * mins, "days": days, "share": share}
