import random
from datetime import date

from app.analytics import analytics, readiness, verdict, weak_skills
from app.mock import allocate, build_mock
from app.planner import build_plan
from app.schemas import QuestionStat
from tests.conftest import all_correct


def stats_of(raw):
    return {k: QuestionStat(**v) for k, v in raw.items()}


def test_fresh_learner_is_zero_and_building(content):
    assert readiness({}, content) == 0
    assert verdict(0)["level"] == "building"


def test_everything_correct_is_100(content):
    assert readiness(stats_of(all_correct(content)), content) == 100


def test_wrong_last_answer_lowers_then_fix_restores(content):
    raw = all_correct(content)
    qid = content.questions[0]["id"]
    raw[qid] = {"right": 1, "wrong": 1, "last": False}
    assert readiness(stats_of(raw), content) < 100
    raw[qid] = {"right": 2, "wrong": 1, "last": True}
    assert readiness(stats_of(raw), content) == 100


def test_next_step_logic(content):
    assert analytics({}, content)["next_step"]["kind"] == "quick_quiz"
    assert analytics(stats_of(all_correct(content)), content)["next_step"]["kind"] == "mock"
    one = {content.questions[0]["id"]: {"right": 0, "wrong": 1, "last": False}}
    assert analytics(stats_of(one), content, due_cards=9)["next_step"]["kind"] == "cards"
    assert analytics(stats_of(one), content, due_cards=0)["next_step"]["kind"] == "skill"


def test_weak_skills_orders_by_mastery(content):
    raw = {q["id"]: {"right": 1, "wrong": 0, "last": True} for q in content.questions if q["s"] != "a4"}
    assert weak_skills(stats_of(raw), content)[0] == "a4"


def test_allocate_sums_exactly():
    for n in (1, 7, 30, 40):
        assert sum(allocate(n, [0.275, 0.375, 0.35])) == n


def test_mock_is_balanced_unique_and_sized(content):
    ids = build_mock(30, content, random.Random(3))
    assert len(ids) == 30 == len(set(ids))
    by = {}
    for i in ids:
        d = content.skills[content.question_by_id[i]["s"]]["d"]
        by[d] = by.get(d, 0) + 1
    assert by == {"cloud": 8, "arch": 11, "mgmt": 11}


def test_plan_gives_weak_skill_most_days_and_ends_with_mock_review(content):
    raw = {q["id"]: {"right": 1, "wrong": 0, "last": True} for q in content.questions if q["s"] != "a4"}
    p = build_plan(date(2026, 10, 1), date(2026, 10, 21), 2, stats_of(raw), content)
    assert p["n"] == 20 == len(p["days"])
    assert p["days"][-1]["kind"] == "review" and p["days"][-2]["kind"] == "mock"
    assert p["share"]["a4"] == max(p["share"].values())
    study = [d for d in p["days"] if d["kind"] == "study"]
    assert all(a["skill"] != b["skill"] for a, b in zip(study, study[1:]))


def test_plan_edge_cases(content):
    assert build_plan(date(2026, 10, 1), date(2026, 10, 1), 1, {}, content)["exam_day"] is True
    assert build_plan(date(2026, 10, 2), date(2026, 10, 1), 1, {}, content)["error"] == "past"
    short = build_plan(date(2026, 10, 1), date(2026, 10, 3), 1, {}, content)
    assert len(short["days"]) == 2 and all(d["kind"] == "study" for d in short["days"])
