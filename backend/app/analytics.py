"""Readiness maths.

A question counts as *mastered* when the learner's most recent answer to it was correct.
Unattempted questions count as not mastered, so readiness cannot be inflated by practising
only easy topics, and it recovers immediately when a mistake is fixed.
Readiness = sum over exam areas of (area weight x mean mastery of the area's skills).
"""
from __future__ import annotations

from typing import Any

from .content import Content
from .schemas import Stats

PASS_MARK = 70   # the real exam passes at 700/1000
READY_MARK = 80  # our safety margin above the pass mark


def skill_report(stats: Stats, content: Content) -> dict[str, dict[str, Any]]:
    rep = {s: {"total": 0, "attempted": 0, "mastered": 0, "right": 0, "wrong": 0} for s in content.skills}
    for q in content.questions:
        r, st = rep[q["s"]], stats.get(q["id"])
        r["total"] += 1
        if st:
            r["attempted"] += 1
            r["right"] += st.right
            r["wrong"] += st.wrong
            r["mastered"] += 1 if st.last else 0
    for r in rep.values():
        r["mastery"] = r["mastered"] / r["total"] if r["total"] else 0.0
        answered = r["right"] + r["wrong"]
        r["accuracy"] = r["right"] / answered if answered else None
    return rep


def domain_report(stats: Stats, content: Content) -> dict[str, dict[str, Any]]:
    sk, out = skill_report(stats, content), {}
    for d in content.domains:
        ids = content.skills_of(d)
        right = sum(sk[s]["right"] for s in ids)
        wrong = sum(sk[s]["wrong"] for s in ids)
        out[d] = {
            "mastery": sum(sk[s]["mastery"] for s in ids) / len(ids),
            "accuracy": right / (right + wrong) if right + wrong else None,
        }
    return out


def readiness(stats: Stats, content: Content) -> int:
    dr = domain_report(stats, content)
    return round(100 * sum(content.domains[d]["weight"] * dr[d]["mastery"] for d in content.domains))


def verdict(p: int) -> dict[str, str]:
    if p >= READY_MARK:
        return {"level": "ready", "text": "You look ready to book your exam"}
    if p >= 60:
        return {"level": "close", "text": "Getting close. Fix the weak skills below"}
    return {"level": "building", "text": "Keep building. Every question you fix raises your score"}


def weak_skills(stats: Stats, content: Content) -> list[str]:
    sk = skill_report(stats, content)
    return sorted(sk, key=lambda s: (sk[s]["mastery"], s))


def next_step(stats: Stats, content: Content, due_cards: int) -> dict[str, Any]:
    sk, p = skill_report(stats, content), readiness(stats, content)
    weak = weak_skills(stats, content)[0]
    if not any(stats.get(q["id"]) for q in content.questions):
        return {"kind": "quick_quiz", "title": "Take your first quiz",
                "detail": "Ten quick questions from every topic show us where you stand."}
    if p >= READY_MARK:
        return {"kind": "mock", "title": "You are ready. Prove it with a timed mock exam",
                "detail": "30 questions, 30 minutes, pass mark 70%."}
    if due_cards >= 5:
        return {"kind": "cards", "title": f"Revise {due_cards} flashcards that are due",
                "detail": "Cards you missed come back first. Five minutes now saves hours later."}
    pct = round(sk[weak]["mastery"] * 100)
    return {"kind": "skill", "skill": weak, "title": f"Strengthen: {content.skills[weak]['name']}",
            "detail": f"You have mastered {pct}% of its questions. It is your weakest skill."}


def analytics(stats: Stats, content: Content, due_cards: int = 0) -> dict[str, Any]:
    p = readiness(stats, content)
    return {
        "readiness": p,
        "verdict": verdict(p),
        "domains": domain_report(stats, content),
        "skills": skill_report(stats, content),
        "weak": weak_skills(stats, content),
        "next_step": next_step(stats, content, due_cards),
        "pass_mark": PASS_MARK,
        "ready_mark": READY_MARK,
    }
