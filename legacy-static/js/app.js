/* UI layer. Data lives in data.js, pure logic in logic.js, AI calls in buddy.js. */
(function () {
  "use strict";
  const { DOMAINS, SKILLS, QUESTIONS, CARDS, LINKS } = window.AZ_DATA;
  const L = window.AZ_LOGIC;
  const B = window.AZ_BUDDY;
  const QBY = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  const KEY = "az900_unofficial_v2";
  const MOCK_N = 30, MOCK_MINUTES = 30;

  // ---------- state ----------
  let S = load();
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.v === 2) return Object.assign(L.newState(), raw);
    } catch (e) { /* storage blocked or corrupt */ }
    return L.newState();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const app = $("#app");
  const tone = (p) => (p >= 80 ? "good" : p >= 50 ? "warn" : "bad");
  const pct = (x) => Math.round(x * 100);
  const mdLite = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  const meter = (p) => `<div class="meter ${tone(p)}" role="img" aria-label="${p}%"><i style="width:${p}%"></i></div>`;
  const skillName = (id) => SKILLS[id].name;
  let timer = null;
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = $("#confetti"), set = ["🎉", "☁️", "✨", "🌍", "🚀", "⭐"];
    for (let i = 0; i < 28; i++) {
      const s = document.createElement("span");
      s.textContent = set[i % set.length];
      s.style.left = Math.random() * 100 + "vw";
      s.style.animationDelay = Math.random() * 0.8 + "s";
      box.appendChild(s);
      setTimeout(() => s.remove(), 3600);
    }
  }

  // ---------- chrome ----------
  const TABS = [["home", "Home"], ["practice", "Practice"], ["mock", "Mock exam"], ["cards", "Flashcards"], ["buddy", "AI Buddy"], ["plan", "Study plan"], ["progress", "Progress"]];
  let view = "home";
  function renderChrome() {
    $("#nav").innerHTML = TABS.map(([k, n]) => `<button data-act="go" data-v="${k}" class="${k === view ? "on" : ""}" ${k === view ? 'aria-current="page"' : ""}>${n}</button>`).join("");
    const st = L.liveStreak(S), due = L.dueCards(S).length;
    $("#chips").innerHTML = `<span class="chip" title="Days in a row you practised">🔥 ${st}</span><span class="chip" title="Flashcards due">🧠 ${due}</span>`;
  }
  function go(v, focus = true) {
    stopTimer(); view = v; renderChrome(); VIEWS[v]();
    if (focus) { app.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }
  }

  // ---------- HOME ----------
  function ring(p, lvl) {
    const c = 2 * Math.PI * 64;
    return `<div class="ring lvl-${lvl}" role="img" aria-label="Readiness ${p} percent">
      <svg width="150" height="150" viewBox="0 0 150 150"><circle class="track" cx="75" cy="75" r="64" fill="none" stroke-width="14"/>
      <circle class="val" cx="75" cy="75" r="64" fill="none" stroke="var(--lvl)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${c * (1 - p / 100)}"/></svg>
      <div class="num" style="color:var(--lvl)"><div>${p}%<small>readiness</small></div></div></div>`;
  }
  function animateRings() {
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll(".ring .val").forEach((c) => { c.style.strokeDashoffset = c.dataset.target; })));
  }
  function nextStep() {
    const sk = L.skillReport(S), weak = L.weakSkills(S)[0], p = L.readiness(S);
    const attempted = Object.keys(S.stats).length, due = L.dueCards(S).length;
    if (!attempted) return { t: "Take your first quiz", d: "Ten quick questions from every topic show us where you stand.", a: "startQuick", label: "Start 10-question quiz" };
    if (p >= L.READY_MARK) return { t: "You are ready. Prove it with a timed mock exam", d: `${MOCK_N} questions, ${MOCK_MINUTES} minutes, pass mark ${L.PASS_MARK}%.`, a: "go", v: "mock", label: "Start mock exam" };
    if (due >= 5) return { t: `Revise ${due} flashcards that are due`, d: "Cards you missed come back first. Five minutes now saves hours later.", a: "go", v: "cards", label: "Open flashcards" };
    return { t: `Strengthen: ${skillName(weak)}`, d: `You have mastered ${pct(sk[weak].mastery)}% of its questions. It is your weakest skill.`, a: "startSkill", s: weak, label: "Practise this skill" };
  }
  function home() {
    const p = L.readiness(S), v = L.verdict(p), sk = L.skillReport(S), n = nextStep();
    const attrs = Object.entries(n).filter(([k]) => k === "v" || k === "s").map(([k, x]) => `data-${k}="${x}"`).join(" ");
    app.innerHTML = `
    <section class="card hero">${ring(p, v.level)}
      <div><div class="mute">Your readiness</div><h2 style="margin:0">${esc(v.text)}</h2>
      <p class="mute" style="margin:.4rem 0 0">Based on how many of the ${QUESTIONS.length} questions you currently answer correctly, weighted by exam skill areas. Pass mark on the real exam is 700/1000; we aim for ${L.READY_MARK}% for a safety margin.</p></div>
    </section>
    <section class="card next"><div class="mute">Next best step</div><h3>${esc(n.t)}</h3><p class="mute">${esc(n.d)}</p>
      <button class="btn primary" data-act="${n.a}" ${attrs}>${esc(n.label)}</button></section>
    ${Object.keys(DOMAINS).map((d) => `<section class="card"><div class="row"><h3 class="grow">${DOMAINS[d].name}</h3><span class="mute">exam weight ${DOMAINS[d].range}</span></div>
      <div class="grid">${Object.keys(SKILLS).filter((s) => SKILLS[s].d === d).map((s) => { const m = pct(sk[s].mastery);
        return `<button class="tile" data-act="startSkill" data-s="${s}"><div class="n">${esc(skillName(s))}</div><div class="pct">${m}%</div>${meter(m)}<div class="n">${sk[s].attempted}/${sk[s].total} tried</div></button>`; }).join("")}</div></section>`).join("")}
    <section class="card"><h3>Official resources</h3>
      <p class="row"><a class="btn sm" href="${LINKS.studyGuide}" target="_blank" rel="noopener">AZ-900 skills outline</a>
      <a class="btn sm" href="${LINKS.certification}" target="_blank" rel="noopener">Certification page</a>
      <a class="btn sm" href="${LINKS.practice}" target="_blank" rel="noopener">Free Microsoft practice assessment</a>
      <a class="btn sm" href="${LINKS.sandbox}" target="_blank" rel="noopener">Exam sandbox</a></p>
      <p class="mute">This app is unofficial and its questions are original. Use Microsoft's own practice assessment and Learn modules alongside it.</p></section>`;
    animateRings();
  }

  // ---------- PRACTICE ----------
  let quiz = null;
  function practice() {
    const weak = L.weakSkills(S)[0];
    app.innerHTML = `<section class="card"><h2>Practice</h2>
      <p class="mute">Answer, get instant feedback and an explanation, plus a real-life African analogy for every question.</p>
      <div class="row" style="margin:12px 0">
        <select id="scope" aria-label="Topic">
          <option value="all">All topics (mixed)</option>
          <option value="mistakes">My mistakes (last answer wrong)</option>
          ${Object.keys(DOMAINS).map((d) => `<optgroup label="${esc(DOMAINS[d].name)}"><option value="d:${d}">Whole area: ${esc(DOMAINS[d].name)}</option>${Object.keys(SKILLS).filter((s) => SKILLS[s].d === d).map((s) => `<option value="s:${s}">${esc(skillName(s))}</option>`).join("")}</optgroup>`).join("")}
        </select>
        <select id="count" aria-label="Number of questions"><option value="10">10 questions</option><option value="20">20 questions</option><option value="999">All</option></select>
        <button class="btn primary" data-act="startQuiz">Start</button></div>
      <button class="btn sm" data-act="startSkill" data-s="${weak}">⚡ Drill my weakest skill: ${esc(skillName(weak))}</button></section>`;
  }
  function pool(scope) {
    if (scope === "mistakes") return QUESTIONS.filter((q) => S.stats[q.id] && !S.stats[q.id].last);
    if (scope.startsWith("d:")) return QUESTIONS.filter((q) => SKILLS[q.s].d === scope.slice(2));
    if (scope.startsWith("s:")) return QUESTIONS.filter((q) => q.s === scope.slice(2));
    return QUESTIONS;
  }
  function beginQuiz(scope, n) {
    const qs = pool(scope);
    if (!qs.length) { app.insertAdjacentHTML("beforeend", `<div class="card">Nothing here yet. Great: no recorded mistakes! Try another topic.</div>`); return; }
    quiz = { ids: L.shuffle(qs).slice(0, n).map((q) => q.id), i: 0, score: 0, missed: [] };
    view = "practice"; renderChrome(); showQ();
  }
  function showQ() {
    if (quiz.i >= quiz.ids.length) return endQuiz();
    const q = QBY[quiz.ids[quiz.i]];
    quiz.cur = { q, order: L.shuffle([0, 1, 2, 3]), done: false, picked: -1 };
    app.innerHTML = `<section class="card">
      <div class="row"><span class="mute grow">${esc(skillName(q.s))} · ${quiz.i + 1}/${quiz.ids.length}</span><span class="mute">Score ${quiz.score}</span><button class="btn sm" data-act="go" data-v="practice">Quit</button></div>
      ${meter(quiz.i / quiz.ids.length * 100)}
      <h3 style="margin-top:14px" id="qtext">${esc(q.q)}</h3>
      <div role="group" aria-labelledby="qtext">${quiz.cur.order.map((k, pos) => `<button class="opt" data-act="ans" data-pos="${pos}"><span class="k">${"ABCD"[pos]}</span>${esc(q.o[k])}</button>`).join("")}</div>
      <div id="fb" aria-live="polite"></div></section>`;
  }
  function answer(pos) {
    const c = quiz.cur; if (!c || c.done) return; c.done = true; c.picked = pos;
    const q = c.q, ok = c.order[pos] === q.a;
    L.recordAnswer(S, q, ok); L.touchStreak(S); save(); renderChrome();
    if (ok) quiz.score++; else quiz.missed.push(q.id);
    document.querySelectorAll(".opt").forEach((b, k) => { b.disabled = true; if (c.order[k] === q.a) b.classList.add("right"); else if (k === pos) b.classList.add("wrong"); });
    const last = quiz.i + 1 >= quiz.ids.length;
    $("#fb").innerHTML = `<div class="fb"><p><b style="color:${ok ? "var(--good)" : "var(--bad)"}">${ok ? "✅ Correct!" : "❌ Not quite."}</b> ${esc(q.e)}</p>
      <div class="africa">🌍 <b>Think of it like this:</b> ${esc(q.af)}</div>
      <div id="buddyfb"></div>
      <div class="row"><button class="btn primary" data-act="next" id="nextbtn">${last ? "See results" : "Next"} →</button>
      <button class="btn" data-act="explain">🤖 Explain it more</button></div></div>`;
    $("#nextbtn").focus({ preventScroll: true });
  }
  async function explain() {
    const c = quiz && quiz.cur; if (!c || !c.done) return;
    const box = $("#buddyfb");
    if (!S.key) { box.innerHTML = `<div class="buddybox">Add your Claude API key in the <a href="#" data-act="go" data-v="buddy">AI Buddy</a> tab to get a personalised explanation in your language. Everything else works without it.</div>`; return; }
    box.innerHTML = `<div class="buddybox">Thinking…</div>`;
    try {
      const picked = c.q.o[c.order[c.picked]];
      const text = await B.ask({ key: S.key, lang: S.lang, messages: [{ role: "user", content: B.explainPrompt(c.q, picked, c.order[c.picked] === c.q.a) }] });
      box.innerHTML = `<div class="buddybox">🤖 ${mdLite(text)}</div>`;
    } catch (e) { box.innerHTML = `<div class="buddybox" style="color:var(--bad)">${esc(e.message)}</div>`; }
  }
  function endQuiz() {
    const n = quiz.ids.length, p = Math.round(quiz.score / n * 100);
    S.history.push({ d: Date.now(), type: "quiz", pct: p, n }); S.history = S.history.slice(-40); save();
    if (p >= 80) confetti();
    app.innerHTML = `<section class="card"><div class="mute">Quiz complete</div><div style="font-size:2.4rem;font-weight:800">${quiz.score}/${n} <span class="mute" style="font-size:1.2rem">(${p}%)</span></div>
      <p>${p >= 80 ? "Excellent work! 🎉" : p >= 60 ? "Good effort. Review the ones you missed below." : "Keep going. Missed terms are now waiting in your flashcards."}</p>
      ${quiz.missed.length ? `<h3>To review</h3>${quiz.missed.map((id) => { const q = QBY[id]; return `<details><summary>${esc(q.q)}</summary><p><b>Answer:</b> ${esc(q.o[q.a])}<br>${esc(q.e)}</p></details>`; }).join("")}` : ""}
      <div class="row" style="margin-top:12px"><button class="btn primary" data-act="go" data-v="practice">Another quiz</button><button class="btn" data-act="go" data-v="cards">Flashcards</button><button class="btn" data-act="go" data-v="progress">See progress</button></div></section>`;
    renderChrome();
  }

  // ---------- MOCK EXAM ----------
  let mock = null;
  function mockHome() {
    const hist = S.history.filter((h) => h.type === "mock").slice(-5);
    app.innerHTML = `<section class="card"><h2>Mock exam</h2>
      <p>${MOCK_N} questions in ${MOCK_MINUTES} minutes, balanced across the three skill areas like the real exam. No feedback until you submit. Pass mark ${L.PASS_MARK}%.</p>
      <p class="mute">This is a simulation to practise pacing, not a prediction. The real exam also has other question types. Try Microsoft's free <a href="${LINKS.sandbox}" target="_blank" rel="noopener">exam sandbox</a> to see them.</p>
      <button class="btn primary" data-act="startMock">Start mock exam</button>
      ${hist.length ? `<h3 style="margin-top:18px">Recent attempts</h3><p>${hist.map((h) => `<span class="chip">${h.pct >= L.PASS_MARK ? "✅" : "❌"} ${h.pct}%</span>`).join("")}</p>` : ""}</section>`;
  }
  function startMock() {
    const ids = L.buildMock(MOCK_N);
    mock = { ids, i: 0, ans: {}, order: {}, endAt: Date.now() + MOCK_MINUTES * 60000 };
    ids.forEach((id) => { mock.order[id] = L.shuffle([0, 1, 2, 3]); });
    stopTimer(); timer = setInterval(tick, 1000);
    showMock();
  }
  function tick() {
    const left = Math.max(0, mock.endAt - Date.now()), el = $("#tm");
    if (el) { el.textContent = `${String(Math.floor(left / 60000)).padStart(2, "0")}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}`; el.classList.toggle("low", left < 5 * 60000); }
    if (left <= 0) submitMock(true);
  }
  function showMock() {
    const id = mock.ids[mock.i], q = QBY[id], order = mock.order[id], n = mock.ids.length;
    app.innerHTML = `<section class="card">
      <div class="row"><span class="grow mute">Question ${mock.i + 1} of ${n}</span><span>⏱ <span class="timer" id="tm">--:--</span></span></div>
      <div class="dots" role="group" aria-label="Question navigator">${mock.ids.map((x, k) => `<button class="dot ${mock.ans[x] !== undefined ? "done" : ""} ${k === mock.i ? "cur" : ""}" data-act="mockGo" data-k="${k}" aria-label="Question ${k + 1}">${k + 1}</button>`).join("")}</div>
      <h3 id="qtext">${esc(q.q)}</h3>
      <div role="group" aria-labelledby="qtext">${order.map((k, pos) => `<button class="opt ${mock.ans[id] === pos ? "sel" : ""}" data-act="mockPick" data-pos="${pos}"><span class="k">${"ABCD"[pos]}</span>${esc(q.o[k])}</button>`).join("")}</div>
      <div class="row" style="margin-top:10px"><button class="btn" data-act="mockGo" data-k="${mock.i - 1}" ${mock.i === 0 ? "disabled" : ""}>← Back</button>
      ${mock.i < n - 1 ? `<button class="btn primary" data-act="mockGo" data-k="${mock.i + 1}">Next →</button>` : ""}
      <span class="grow"></span><button class="btn" data-act="submitMock">Submit exam</button></div></section>`;
    tick();
  }
  function submitMock(auto) {
    if (!mock) return;
    const unanswered = mock.ids.filter((id) => mock.ans[id] === undefined).length;
    if (!auto && unanswered && !confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
    stopTimer();
    let right = 0; const byDomain = {}; Object.keys(DOMAINS).forEach((d) => { byDomain[d] = { r: 0, n: 0 }; });
    const rows = mock.ids.map((id) => {
      const q = QBY[id], pos = mock.ans[id], d = SKILLS[q.s].d;
      const given = pos === undefined ? null : mock.order[id][pos], ok = given === q.a;
      byDomain[d].n++; if (ok) { right++; byDomain[d].r++; }
      if (given !== null) L.recordAnswer(S, q, ok);
      return { q, given, ok };
    });
    const p = Math.round(right / mock.ids.length * 100), passed = p >= L.PASS_MARK;
    L.touchStreak(S); S.history.push({ d: Date.now(), type: "mock", pct: p, n: mock.ids.length }); S.history = S.history.slice(-40); save();
    if (passed) confetti();
    app.innerHTML = `<section class="card"><div class="mute">${auto ? "Time is up. " : ""}Mock exam result</div>
      <div style="font-size:2.6rem;font-weight:800;color:${passed ? "var(--good)" : "var(--bad)"}">${p}% <span style="font-size:1.1rem">${passed ? "PASS (simulated)" : "Not yet"}</span></div>
      <p class="mute">${right}/${mock.ids.length} correct. Pass mark ${L.PASS_MARK}%.</p>
      ${Object.keys(DOMAINS).map((d) => { const x = byDomain[d], v = x.n ? Math.round(x.r / x.n * 100) : 0; return `<div>${esc(DOMAINS[d].name)}: ${x.r}/${x.n}${meter(v)}</div>`; }).join("")}
      <h3 style="margin-top:16px">Review</h3>
      ${rows.map((r, k) => `<details><summary>${r.ok ? "✅" : r.given === null ? "⚪" : "❌"} ${k + 1}. ${esc(r.q.q)}</summary>
        <p>${r.given === null ? "<i>Not answered.</i> " : `<b>Your answer:</b> ${esc(r.q.o[r.given])}<br>`}<b>Correct:</b> ${esc(r.q.o[r.q.a])}<br>${esc(r.q.e)}</p><div class="africa">🌍 ${esc(r.q.af)}</div></details>`).join("")}
      <div class="row" style="margin-top:14px"><button class="btn primary" data-act="startMock">Retake (new mix)</button><button class="btn" data-act="go" data-v="progress">Progress</button></div></section>`;
    mock = null; renderChrome();
  }

  // ---------- FLASHCARDS ----------
  let deck = [], flipped = false;
  function cards() { deck = L.dueCards(S); flipped = false; showCard(); }
  function showCard() {
    if (!deck.length) {
      const learned = Object.values(S.boxes).filter((b) => b.box >= 3).length;
      app.innerHTML = `<section class="card"><h2>All caught up 🎉</h2><p class="mute">No flashcards are due right now. You have ${learned} of ${Object.keys(CARDS).length} cards in the long-term boxes. Take a quiz to find new weak spots, because every miss sends its card back here.</p><button class="btn primary" data-act="go" data-v="practice">Practise</button></section>`;
      return;
    }
    const id = deck[0], c = CARDS[id], missed = S.boxes[id] && S.boxes[id].box === 0;
    app.innerHTML = `<section class="card"><div class="row"><span class="grow mute">${esc(skillName(c[2]))}${missed ? " · ⚠️ you missed this" : ""}</span><span class="mute">${deck.length} due</span></div>
      <div class="flash" data-act="flip" tabindex="0" role="button" aria-label="Flip card">${flipped ? `<div>${esc(c[1])}</div>` : `<div><b>${esc(c[0])}</b><div class="mute" style="margin-top:8px">Tap or press Space to reveal</div></div>`}</div>
      <div class="row" style="justify-content:center;${flipped ? "" : "visibility:hidden"}"><button class="btn" data-act="rate" data-ok="0">😕 Still learning (1)</button><button class="btn primary" data-act="rate" data-ok="1">✅ I knew it (2)</button></div>
      <p class="mute" style="text-align:center">Spaced repetition: cards you know return after 1, 3, 7 then 14 days. Cards you miss come back now.</p></section>`;
  }
  function rate(ok) {
    const id = deck.shift(); S.boxes[id] = L.rateCard(S.boxes[id], ok); L.touchStreak(S); save();
    if (!ok) deck.push(id);
    flipped = false; renderChrome(); showCard();
  }

  // ---------- AI BUDDY ----------
  const chat = [];
  let pending = false;
  const SUGGEST = ["Explain IaaS, PaaS and SaaS like I am new", "What is an availability zone?", "Azure Policy vs RBAC: what is the difference?", "Why is ExpressRoute different from a VPN?", "Give me a memory trick for LRS, ZRS and GRS"];
  function localAnswer(text) {
    const words = text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    let best = null, score = 0;
    for (const id in CARDS) {
      const hay = (CARDS[id][0] + " " + CARDS[id][1]).toLowerCase();
      const sc = words.reduce((a, w) => a + (hay.includes(w) ? 1 : 0), 0) + (words.some((w) => CARDS[id][0].toLowerCase().includes(w)) ? 2 : 0);
      if (sc > score) { score = sc; best = id; }
    }
    if (!best) return "I could not find that in my offline notes. Add a Claude API key above to ask anything on the AZ-900 outline, or try the Flashcards tab.";
    const q = QUESTIONS.find((x) => x.c === best);
    return `**${CARDS[best][0]}**\n${CARDS[best][1]}${q ? `\n\n🌍 ${q.af}` : ""}\n\n(Offline mode. Add a Claude API key for full explanations in your language.)`;
  }
  function buddy() {
    app.innerHTML = `<section class="card"><h2>🤖 AI Study Buddy</h2>
      <p class="mute">Ask about any AZ-900 concept. Answers use simple words and real-life African examples, in the language you choose. Technical terms stay in English so they match the exam.</p>
      <div class="row">
        <label>Language <select id="lang">${B.LANGUAGES.map((l) => `<option ${l === S.lang ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
        ${S.key ? `<span class="chip">🔑 key saved on this device</span><button class="btn sm" data-act="rmKey">Remove key</button>` :
          `<input id="key" type="password" placeholder="Claude API key (optional)" autocomplete="off" style="flex:1;min-width:200px"><button class="btn sm" data-act="saveKey">Save key</button>`}
      </div>
      <p class="mute" style="font-size:.8rem">Your key stays in this browser and is sent only to api.anthropic.com. Use a key with a low spend limit. Without a key you still get offline answers from the built-in notes. Non-English answers may contain mistakes, so double-check with Microsoft Learn.</p>
      <div class="sugg">${SUGGEST.map((s) => `<button class="btn sm" data-act="suggest" data-t="${esc(s)}">${esc(s)}</button>`).join("")}</div>
      <div class="chat" id="chat" aria-live="polite">${chat.length ? "" : `<div class="msg ai">Hi! I am your unofficial AZ-900 study buddy. What would you like to understand today?</div>`}${chat.map((m) => `<div class="msg ${m.role === "user" ? "me" : "ai"}">${mdLite(m.content)}</div>`).join("")}</div>
      <div class="row" style="margin-top:10px"><textarea id="ask" rows="2" placeholder="Type your question…" aria-label="Your question"></textarea><button class="btn primary" data-act="send" id="sendbtn">Send</button></div></section>`;
    const c = $("#chat"); c.scrollTop = c.scrollHeight;
  }
  async function send(text) {
    text = text.trim(); if (!text || pending) return;
    chat.push({ role: "user", content: text }); pending = true; buddy();
    const c = $("#chat"); c.insertAdjacentHTML("beforeend", `<div class="msg ai" id="think">Thinking…</div>`); c.scrollTop = c.scrollHeight;
    let reply;
    try {
      reply = S.key ? await B.ask({ key: S.key, lang: S.lang, messages: chat.slice(-8).map((m) => ({ role: m.role, content: m.content })) }) : localAnswer(text);
    } catch (e) { reply = "⚠️ " + e.message + "\n\n" + localAnswer(text); }
    chat.push({ role: "assistant", content: reply }); pending = false; if (view === "buddy") buddy();
  }

  // ---------- PLAN ----------
  let lastPlan = null;
  function plan() {
    app.innerHTML = `<section class="card"><h2>Study plan</h2>
      <p class="mute">Enter your exam date and daily study time. Weaker skills get more days, and the plan ends with a mock exam and a light review.</p>
      <div class="row" style="margin:12px 0"><label>Exam date <input type="date" id="pd" value="${esc(S.exam)}" min="${L.dayKey()}"></label>
      <label>Hours per day <input type="number" id="ph" min="0.5" max="12" step="0.5" value="${S.hours}" style="width:80px"></label>
      <button class="btn primary" data-act="makePlan">Build plan</button></div><div id="pout"></div></section>`;
    if (S.exam) makePlan(true);
  }
  function makePlan(quiet) {
    const exam = $("#pd").value, hours = Math.max(0.5, +$("#ph").value || 1), out = $("#pout");
    if (!exam) { out.innerHTML = `<p class="mute">Please pick your exam date.</p>`; return; }
    S.exam = exam; S.hours = hours; save();
    const today = L.dayKey(), p = L.buildPlan({ today, exam, hours, state: S });
    if (p.error) { out.innerHTML = `<p style="color:var(--bad)">That date has passed. Pick a future date.</p>`; return; }
    if (p.examDay) { out.innerHTML = `<h3>It is exam day! 🍀</h3><p>Skim your flashcards, drink water, and trust your preparation.</p>`; return; }
    const base = new Date(today + "T00:00:00");
    const label = (k) => { const d = new Date(base.getTime() + k * 864e5); return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }); };
    const m = (x) => (x >= 60 ? `${Math.floor(x / 60)}h${x % 60 ? " " + (x % 60) + "m" : ""}` : `${x}m`);
    const rows = p.days.map((d, k) => {
      let task;
      if (d.kind === "review") task = `Light review: flashcards only (${m(d.mins.cards)}). Sleep early.`;
      else if (d.kind === "mock") task = `Timed mock exam (${m(d.mins.mock)})${d.mins.review ? `, then review every mistake (${m(d.mins.review)})` : ""}`;
      else task = `<b>${esc(skillName(d.skill))}</b><br><span class="mute">Read the Microsoft Learn module ${m(d.mins.learn)} · topic quiz ${m(d.mins.quiz)} · flashcards ${m(d.mins.cards)}</span>`;
      return `<tr><td style="white-space:nowrap">${label(k)}</td><td>${task}</td></tr>`;
    }).join("");
    const share = Object.entries(p.share).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${esc(skillName(s))} (${n}d)`).join(" · ");
    out.innerHTML = `<p><b>${p.n} day${p.n > 1 ? "s" : ""}</b> to go · <b>${(p.totalMinutes / 60).toFixed(1)} study hours</b> in total.</p>
      <table class="table"><tr><th>Day</th><th>Focus</th></tr>${rows}</table>
      <p class="mute">Time by need: ${share}.</p>
      <div class="row"><button class="btn" data-act="ics">📅 Add to calendar (.ics)</button><button class="btn" data-act="print">🖨 Print</button></div>`;
    lastPlan = { p, base };
  }
  function downloadICS() {
    if (!lastPlan) return;
    const { p, base } = lastPlan, f = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
    const ev = p.days.map((d, k) => {
      const s = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate() + k)), e = new Date(s.getTime() + 864e5);
      const t = d.kind === "study" ? `AZ-900: ${skillName(d.skill)}` : d.kind === "mock" ? "AZ-900: mock exam" : "AZ-900: light review";
      return ["BEGIN:VEVENT", `UID:az900-${f(s)}@prep-buddy`, `DTSTAMP:${f(new Date())}T000000Z`, `DTSTART;VALUE=DATE:${f(s)}`, `DTEND;VALUE=DATE:${f(e)}`, `SUMMARY:${t}`, "END:VEVENT"].join("\r\n");
    });
    download("az900-study-plan.ics", "text/calendar", ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AZ-900 Prep Buddy (unofficial)//EN", ...ev, "END:VCALENDAR"].join("\r\n"));
  }
  function download(name, type, text) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- PROGRESS ----------
  function badges() {
    const sk = L.skillReport(S), p = L.readiness(S);
    return [
      ["🌱", "First steps", Object.keys(S.stats).length > 0],
      ["🔥", "3-day streak", S.streak.days >= 3],
      ["🧠", "Card collector", Object.values(S.boxes).filter((b) => b.box >= 2).length >= 10],
      ["🎯", "Perfect quiz", S.history.some((h) => h.type === "quiz" && h.pct === 100 && h.n >= 10)],
      ["🧭", "All-rounder", Object.values(sk).every((s) => s.mastery >= 0.5)],
      ["📝", "Mock passed", S.history.some((h) => h.type === "mock" && h.pct >= L.PASS_MARK)],
      ["🏆", "Exam ready", p >= L.READY_MARK],
    ];
  }
  function progress() {
    const p = L.readiness(S), v = L.verdict(p), sk = L.skillReport(S), dr = L.domainReport(S);
    const h = S.history.slice(-12), W = 320, H = 70;
    const pts = h.map((x, i) => `${h.length > 1 ? i * (W / (h.length - 1)) : W / 2},${H - (x.pct / 100) * (H - 10) - 5}`).join(" ");
    app.innerHTML = `<section class="card hero">${ring(p, v.level)}<div><h2 style="margin:0">${esc(v.text)}</h2>
      <p class="mute">Readiness counts a question as mastered when your most recent answer was correct. Questions you have not tried count as not mastered, so you cannot look ready by practising only your favourite topics.</p></div></section>
      <section class="card"><h3>By exam area</h3>${Object.keys(DOMAINS).map((d) => { const m = pct(dr[d].mastery); return `<div class="row"><span class="grow">${esc(DOMAINS[d].name)} <span class="mute">(${DOMAINS[d].range})</span></span><b>${m}%</b></div>${meter(m)}`; }).join("<div style='height:10px'></div>")}</section>
      <section class="card"><h3>By skill</h3><table class="table"><tr><th>Skill</th><th>Mastered</th><th>Accuracy</th></tr>
        ${Object.keys(SKILLS).map((s) => `<tr><td>${esc(skillName(s))}</td><td>${sk[s].mastered}/${sk[s].total}</td><td>${sk[s].accuracy === null ? "–" : pct(sk[s].accuracy) + "%"}</td></tr>`).join("")}</table></section>
      <section class="card"><h3>Score history</h3>${h.length ? `<svg viewBox="0 0 ${W} ${H}" width="100%" height="80" role="img" aria-label="Recent scores: ${h.map((x) => x.pct + "%").join(", ")}"><line x1="0" x2="${W}" y1="${H - 0.7 * (H - 10) - 5}" y2="${H - 0.7 * (H - 10) - 5}" stroke="var(--line)" stroke-dasharray="4"/><polyline fill="none" stroke="var(--accent)" stroke-width="3" points="${pts}"/></svg><div class="mute">Dashed line = ${L.PASS_MARK}% pass mark. Last ${h.length} sessions.</div>` : `<p class="mute">Finish a quiz to see your trend.</p>`}</section>
      <section class="card"><h3>Badges</h3><div class="badges">${badges().map(([i, n, on]) => `<div class="bdg ${on ? "on" : ""}"><b>${i}</b>${n}</div>`).join("")}</div></section>
      <section class="card"><h3>Your data</h3><p class="mute">Stored only in this browser. Export to back it up or move to another device.</p>
        <div class="row"><button class="btn" data-act="export">Export</button><label class="btn">Import<input type="file" id="imp" accept="application/json" hidden></label><button class="btn" data-act="reset">Reset progress</button></div></section>`;
    animateRings();
  }
  function exportData() { const c = Object.assign({}, S); delete c.key; download("az900-progress.json", "application/json", JSON.stringify(c, null, 2)); }
  function importData(file) {
    const r = new FileReader();
    r.onload = () => {
      try { const d = JSON.parse(r.result); if (d.v !== 2 || typeof d.stats !== "object") throw 0; const k = S.key; S = Object.assign(L.newState(), d, { key: k }); save(); go("progress"); }
      catch (e) { alert("That file is not a valid progress export."); }
    };
    r.readAsText(file);
  }

  // ---------- events ----------
  const VIEWS = { home, practice, mock: mockHome, cards, buddy, plan, progress };
  const ACTIONS = {
    go: (d) => go(d.v),
    startQuick: () => beginQuiz("all", 10),
    startQuiz: () => beginQuiz($("#scope").value, +$("#count").value),
    startSkill: (d) => beginQuiz("s:" + d.s, 10),
    ans: (d) => answer(+d.pos),
    next: () => { quiz.i++; showQ(); },
    explain,
    startMock,
    mockGo: (d) => { mock.i = Math.max(0, Math.min(mock.ids.length - 1, +d.k)); showMock(); },
    mockPick: (d) => { mock.ans[mock.ids[mock.i]] = +d.pos; showMock(); },
    submitMock: () => submitMock(false),
    flip: () => { if (deck.length) { flipped = true; showCard(); } },
    rate: (d) => rate(d.ok === "1"),
    saveKey: () => { const v = $("#key").value.trim(); if (v) { S.key = v; save(); buddy(); } },
    rmKey: () => { S.key = ""; save(); buddy(); },
    suggest: (d) => send(d.t),
    send: () => send($("#ask").value),
    makePlan: () => makePlan(false),
    ics: downloadICS,
    print: () => window.print(),
    export: exportData,
    reset: () => { if (confirm("Reset all progress on this device?")) { const k = S.key; S = L.newState(); S.key = k; save(); go("home"); } },
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]"); if (!t) return;
    if (t.tagName === "A") e.preventDefault();
    const fn = ACTIONS[t.dataset.act]; if (fn) fn(t.dataset);
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "lang") { S.lang = e.target.value; save(); }
    if (e.target.id === "imp" && e.target.files[0]) importData(e.target.files[0]);
  });
  document.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    if (tag === "TEXTAREA" && view === "buddy" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ACTIONS.send(); return; }
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || e.metaKey || e.ctrlKey) return;
    if (view === "practice" && quiz && quiz.cur && document.querySelector("#fb")) {
      if (!quiz.cur.done && "1234abcd".includes(e.key) && e.key.length === 1) { const pos = "1234".includes(e.key) ? +e.key - 1 : "abcd".indexOf(e.key); answer(pos); }
      else if (quiz.cur.done && (e.key === "Enter" || e.key === "ArrowRight") && tag !== "BUTTON") { e.preventDefault(); ACTIONS.next(); }
    } else if (view === "cards" && deck.length) {
      if (e.key === " " && !flipped) { e.preventDefault(); ACTIONS.flip(); }
      else if (flipped && (e.key === "1" || e.key === "2")) rate(e.key === "2");
    }
  });

  go("home", false);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
