const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../js/data.js");

test("question ids are unique and well formed", () => {
  const ids = new Set();
  for (const q of D.QUESTIONS) {
    assert.ok(!ids.has(q.id), `duplicate id ${q.id}`);
    ids.add(q.id);
    assert.ok(D.SKILLS[q.s], `${q.id}: unknown skill ${q.s}`);
    assert.equal(q.o.length, 4, `${q.id}: needs 4 options`);
    assert.equal(new Set(q.o).size, 4, `${q.id}: duplicate options`);
    assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, `${q.id}: bad answer index`);
    assert.ok(q.e.length > 20 && q.af.length > 15, `${q.id}: missing explanation or analogy`);
    assert.ok(q.id.startsWith(q.s + "-"), `${q.id}: id should start with its skill`);
  }
});

test("every flashcard referenced by a question exists", () => {
  for (const q of D.QUESTIONS) assert.ok(D.CARDS[q.c], `${q.id}: missing card ${q.c}`);
});

test("every card belongs to a real skill", () => {
  for (const [id, c] of Object.entries(D.CARDS)) assert.ok(D.SKILLS[c[2]], `card ${id}: bad skill`);
});

test("every skill has at least 5 questions and 3 cards", () => {
  for (const s in D.SKILLS) {
    assert.ok(D.QUESTIONS.filter((q) => q.s === s).length >= 5, `${s}: too few questions`);
    assert.ok(Object.values(D.CARDS).filter((c) => c[2] === s).length >= 3, `${s}: too few cards`);
  }
});

test("domain weights sum to 1", () => {
  const sum = Object.values(D.DOMAINS).reduce((a, d) => a + d.weight, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test("no Microsoft logos or official-exam claims in content", () => {
  const text = JSON.stringify(D.QUESTIONS).toLowerCase();
  assert.ok(!/real exam question|braindump/.test(text));
});
