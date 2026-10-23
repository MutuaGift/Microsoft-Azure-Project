const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../js/data.js");
const L = require("../js/logic.js");

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test("fresh learner has 0% readiness and verdict 'building'", () => {
  const s = L.newState();
  assert.equal(L.readiness(s), 0);
  assert.equal(L.verdict(0).level, "building");
});

test("answering everything correctly gives 100%", () => {
  const s = L.newState();
  D.QUESTIONS.forEach((q) => L.recordAnswer(s, q, true));
  assert.equal(L.readiness(s), 100);
});

test("a wrong last answer lowers mastery, and fixing it restores it", () => {
  const s = L.newState();
  D.QUESTIONS.forEach((q) => L.recordAnswer(s, q, true));
  const q = D.QUESTIONS[0];
  L.recordAnswer(s, q, false);
  assert.ok(L.readiness(s) < 100);
  L.recordAnswer(s, q, true);
  assert.equal(L.readiness(s), 100);
});

test("a missed question sends its flashcard back to box 0 and due now", () => {
  const s = L.newState();
  const q = D.QUESTIONS[0];
  s.boxes[q.c] = { box: 3, due: Date.now() + 1e9 };
  L.recordAnswer(s, q, false, 5000);
  assert.deepEqual(s.boxes[q.c], { box: 0, due: 5000 });
  assert.ok(L.dueCards(s, D, 5000).includes(q.c));
});

test("leitner: correct promotes (max 4), wrong resets", () => {
  let c = null;
  for (let i = 0; i < 6; i++) c = L.rateCard(c, true, 0);
  assert.equal(c.box, 4);
  assert.equal(c.due, 14 * 864e5);
  assert.equal(L.rateCard(c, false, 0).box, 0);
});

test("allocate hands out exactly the total", () => {
  for (const n of [1, 7, 30, 40]) assert.equal(L.allocate(n, [0.275, 0.375, 0.35]).reduce((a, b) => a + b), n);
});

test("mock exam is the requested size, unique, and roughly follows exam weights", () => {
  const ids = L.buildMock(30, D, seeded(3));
  assert.equal(ids.length, 30);
  assert.equal(new Set(ids).size, 30);
  const byDomain = {};
  ids.forEach((id) => { const d = D.SKILLS[D.QUESTIONS.find((q) => q.id === id).s].d; byDomain[d] = (byDomain[d] || 0) + 1; });
  assert.deepEqual(byDomain, { cloud: 8, arch: 11, mgmt: 11 });
});

test("streak counts consecutive days and resets after a gap", () => {
  const s = L.newState();
  L.touchStreak(s, "2026-10-20"); L.touchStreak(s, "2026-10-20");
  assert.equal(s.streak.days, 1);
  L.touchStreak(s, "2026-10-21"); assert.equal(s.streak.days, 2);
  L.touchStreak(s, "2026-10-24"); assert.equal(s.streak.days, 1);
  assert.equal(L.liveStreak(s, "2026-10-30"), 0);
});

test("plan: weak skills get more days, final days are mock + review", () => {
  const s = L.newState();
  D.QUESTIONS.filter((q) => q.s !== "a4").forEach((q) => L.recordAnswer(s, q, true)); // a4 is the only weak skill
  const p = L.buildPlan({ today: "2026-10-01", exam: "2026-10-21", hours: 2, state: s });
  assert.equal(p.n, 20);
  assert.equal(p.days.length, 20);
  assert.equal(p.days.at(-1).kind, "review");
  assert.equal(p.days.at(-2).kind, "mock");
  const max = Math.max(...Object.values(p.share));
  assert.equal(p.share.a4, max);
  for (let i = 1; i < p.days.length; i++) {
    const a = p.days[i - 1], b = p.days[i];
    if (a.kind === "study" && b.kind === "study") assert.notEqual(a.skill, b.skill, "same skill twice in a row");
  }
});

test("plan edge cases", () => {
  const s = L.newState();
  assert.equal(L.buildPlan({ today: "2026-10-01", exam: "2026-10-01", hours: 1, state: s }).examDay, true);
  assert.equal(L.buildPlan({ today: "2026-10-02", exam: "2026-10-01", hours: 1, state: s }).error, "past");
  const short = L.buildPlan({ today: "2026-10-01", exam: "2026-10-03", hours: 1, state: s });
  assert.equal(short.days.length, 2);
  assert.ok(short.days.every((d) => d.kind === "study"));
});
