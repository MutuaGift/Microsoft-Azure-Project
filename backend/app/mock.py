"""Mock exam builder: stratified by the exam's skill-area weights."""
from __future__ import annotations

import math
import random

from .content import Content


def allocate(total: int, weights: list[float]) -> list[int]:
    """Largest-remainder apportionment: integer shares that sum exactly to `total`."""
    s = sum(weights)
    raw = [w / s * total for w in weights]
    out = [math.floor(r) for r in raw]
    left = total - sum(out)
    for _, i in sorted(((r - math.floor(r), i) for i, r in enumerate(raw)), reverse=True):
        if left <= 0:
            break
        out[i] += 1
        left -= 1
    return out


def build_mock(n: int, content: Content, rng: random.Random | None = None) -> list[str]:
    rng = rng or random.Random()
    domains = list(content.domains)
    counts = allocate(n, [content.domains[d]["weight"] for d in domains])
    ids: list[str] = []
    for d, k in zip(domains, counts):
        pool = [q["id"] for q in content.questions if content.skills[q["s"]]["d"] == d]
        ids += rng.sample(pool, min(k, len(pool)))
    rng.shuffle(ids)
    return ids
