def test_ids_unique_and_well_formed(content):
    ids = set()
    for q in content.questions:
        assert q["id"] not in ids, q["id"]
        ids.add(q["id"])
        assert q["s"] in content.skills
        assert len(q["o"]) == 4 and len(set(q["o"])) == 4
        assert 0 <= q["a"] < 4
        assert len(q["e"]) > 20 and len(q["af"]) > 15
        assert q["id"].startswith(q["s"] + "-")


def test_cards_resolve_and_belong_to_skills(content):
    for q in content.questions:
        assert q["c"] in content.cards, q["id"]
    for cid, card in content.cards.items():
        assert card[2] in content.skills, cid


def test_every_skill_has_coverage(content):
    for s in content.skills:
        assert sum(q["s"] == s for q in content.questions) >= 5
        assert sum(c[2] == s for c in content.cards.values()) >= 3


def test_domain_weights_sum_to_one(content):
    assert abs(sum(d["weight"] for d in content.domains.values()) - 1) < 1e-9
