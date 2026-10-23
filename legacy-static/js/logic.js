/* Pure logic (no DOM) so it can be unit tested with `node --test`. */
(function (root) {
  const D = typeof require !== "undefined" ? require("./data.js") : root.AZ_DATA;

  const PASS_MARK = 70;      // real exam: 700/1000
  const READY_MARK = 80;     // our safety margin above the pass mark
  const GAP_DAYS = [0, 1, 3, 7, 14]; // Leitner box -> days until the card is due again

  function shuffle(arr, rng = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function newState() {
    return { v: 2, stats: {}, boxes: {}, history: [], exam: "", hours: 1.5, streak: { days: 0, last: "" }, lang: "English", key: "" };
  }

  // ---- Mastery & readiness -------------------------------------------------
  // Mastery of a skill = share of its questions whose LAST answer was correct.
  // Unattempted questions count as not mastered, so readiness cannot be gamed by
  // practising only the easy topics, and it recovers as you fix mistakes.
  function skillReport(state, data = D) {
    const rep = {};
    for (const id in data.SKILLS) rep[id] = { total: 0, attempted: 0, mastered: 0, right: 0, wrong: 0 };
    for (const q of data.QUESTIONS) {
      const r = rep[q.s], st = state.stats[q.id];
      r.total++;
      if (st) {
        r.attempted++;
        r.right += st.right;
        r.wrong += st.wrong;
        if (st.last) r.mastered++;
      }
    }
    for (const id in rep) {
      const r = rep[id];
      r.mastery = r.total ? r.mastered / r.total : 0;
      r.accuracy = r.right + r.wrong ? r.right / (r.right + r.wrong) : null;
    }
    return rep;
  }

  function domainReport(state, data = D) {
    const sk = skillReport(state, data), out = {};
    for (const d in data.DOMAINS) {
      const ids = Object.keys(data.SKILLS).filter((s) => data.SKILLS[s].d === d);
      const mastery = ids.reduce((a, s) => a + sk[s].mastery, 0) / ids.length;
      let right = 0, wrong = 0;
      ids.forEach((s) => { right += sk[s].right; wrong += sk[s].wrong; });
      out[d] = { mastery, right, wrong, accuracy: right + wrong ? right / (right + wrong) : null };
    }
    return out;
  }

  function readiness(state, data = D) {
    const dr = domainReport(state, data);
    let sum = 0;
    for (const d in data.DOMAINS) sum += data.DOMAINS[d].weight * dr[d].mastery;
    return Math.round(sum * 100);
  }

  function verdict(p) {
    if (p >= READY_MARK) return { level: "ready", text: "You look ready to book your exam" };
    if (p >= 60) return { level: "close", text: "Getting close. Fix the weak skills below" };
    return { level: "building", text: "Keep building. Every question you fix raises your score" };
  }

  function weakSkills(state, data = D) {
    const sk = skillReport(state, data);
    return Object.keys(sk).sort((a, b) => sk[a].mastery - sk[b].mastery || a.localeCompare(b));
  }

  // ---- Recording answers ---------------------------------------------------
  function recordAnswer(state, q, correct, now = Date.now()) {
    const st = (state.stats[q.id] ||= { right: 0, wrong: 0, last: false });
    correct ? st.right++ : st.wrong++;
    st.last = correct;
    if (!correct && q.c) state.boxes[q.c] = { box: 0, due: now }; // missed -> flashcard back to box 0
    return state;
  }

  function dayKey(ms = Date.now()) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function daysBetween(aKey, bKey) {
    const p = (k) => { const [y, m, d] = k.split("-").map(Number); return Date.UTC(y, m - 1, d); };
    return Math.round((p(bKey) - p(aKey)) / 864e5);
  }
  function touchStreak(state, today = dayKey()) {
    const s = state.streak;
    if (s.last === today) return state;
    s.days = s.last && daysBetween(s.last, today) === 1 ? s.days + 1 : 1;
    s.last = today;
    return state;
  }
  function liveStreak(state, today = dayKey()) {
    const s = state.streak;
    return s.last && daysBetween(s.last, today) <= 1 ? s.days : 0;
  }

  // ---- Flashcards (Leitner) ------------------------------------------------
  function rateCard(prev, ok, now = Date.now()) {
    const box = ok ? Math.min(4, (prev ? prev.box : 0) + 1) : 0;
    return { box, due: now + GAP_DAYS[box] * 864e5 };
  }
  function dueCards(state, data = D, now = Date.now()) {
    const sk = skillReport(state, data);
    const ids = Object.keys(data.CARDS).filter((id) => !state.boxes[id] || state.boxes[id].due <= now);
    const rank = (id) => (state.boxes[id] ? state.boxes[id].box : 1) * 10 + sk[data.CARDS[id][2]].mastery * 5;
    return ids.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }

  // ---- Mock exam -----------------------------------------------------------
  function allocate(total, weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    const raw = weights.map((w) => (w / sum) * total);
    const out = raw.map(Math.floor);
    let left = total - out.reduce((a, b) => a + b, 0);
    raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left-- > 0) out[i]++; });
    return out;
  }
  function buildMock(n = 30, data = D, rng = Math.random) {
    const doms = Object.keys(data.DOMAINS);
    const counts = allocate(n, doms.map((d) => data.DOMAINS[d].weight));
    let ids = [];
    doms.forEach((d, i) => {
      const pool = data.QUESTIONS.filter((q) => data.SKILLS[q.s].d === d);
      ids = ids.concat(shuffle(pool, rng).slice(0, counts[i]));
    });
    return shuffle(ids, rng).map((q) => q.id);
  }

  // ---- Study planner -------------------------------------------------------
  function buildPlan({ today, exam, hours, state, data = D }) {
    const n = daysBetween(today, exam);
    if (n < 0) return { error: "past" };
    if (n === 0) return { examDay: true, days: [] };
    const sk = skillReport(state, data);
    const reviewDay = n >= 3 ? n - 1 : -1;
    const mockDay = n >= 5 ? n - 2 : -1;
    const studyDays = n - (reviewDay >= 0 ? 1 : 0) - (mockDay >= 0 ? 1 : 0);

    const ids = Object.keys(data.SKILLS);
    const perDomain = {};
    ids.forEach((s) => { perDomain[data.SKILLS[s].d] = (perDomain[data.SKILLS[s].d] || 0) + 1; });
    const need = {};
    ids.forEach((s) => { need[s] = (data.DOMAINS[data.SKILLS[s].d].weight / perDomain[data.SKILLS[s].d]) * (1.1 - sk[s].mastery); });

    // Choose which skills fit, then give each one day, then spread the rest by need.
    const chosen = ids.slice().sort((a, b) => need[b] - need[a]).slice(0, Math.max(1, Math.min(ids.length, studyDays)));
    const counts = {};
    chosen.forEach((s) => { counts[s] = 1; });
    const extra = studyDays - chosen.length;
    if (extra > 0) {
      const add = allocate(extra, chosen.map((s) => need[s]));
      chosen.forEach((s, i) => { counts[s] += add[i]; });
    }

    // Interleave: always take the skill with most days left, never the same one twice in a row.
    const seq = [];
    let last = null;
    for (let i = 0; i < studyDays; i++) {
      const pick = chosen.filter((s) => counts[s] > 0 && (s !== last || chosen.every((t) => t === s || counts[t] === 0)))
        .sort((a, b) => counts[b] - counts[a] || need[b] - need[a])[0];
      seq.push(pick); counts[pick]--; last = pick;
    }

    const mins = Math.round(hours * 60);
    const days = [];
    let k = 0;
    for (let d = 0; d < n; d++) {
      if (d === reviewDay) days.push({ kind: "review", mins: { cards: Math.min(mins, 60) } });
      else if (d === mockDay) days.push({ kind: "mock", mins: { mock: Math.min(mins, 45), review: Math.max(0, mins - 45) } });
      else days.push({ kind: "study", skill: seq[k++], mins: { learn: Math.round(mins * 0.5), quiz: Math.round(mins * 0.3), cards: Math.round(mins * 0.2) } });
    }
    const share = {};
    seq.forEach((s) => { share[s] = (share[s] || 0) + 1; });
    return { n, totalMinutes: n * mins, days, share };
  }

  const api = { PASS_MARK, READY_MARK, GAP_DAYS, shuffle, newState, skillReport, domainReport, readiness, verdict, weakSkills,
    recordAnswer, dayKey, daysBetween, touchStreak, liveStreak, rateCard, dueCards, allocate, buildMock, buildPlan };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AZ_LOGIC = api;
})(typeof window !== "undefined" ? window : globalThis);
