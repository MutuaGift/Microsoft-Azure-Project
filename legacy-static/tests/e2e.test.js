// Smoke-tests the real UI in jsdom: every tab renders and the main flows work end to end.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require("jsdom")); } catch (e) { /* jsdom not installed */ }

const root = path.join(__dirname, "..");
function boot() {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e.message));
  vc.on("error", (e) => errors.push(String(e)));
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8").replace(/<script src="([^"]+)"><\/script>/g, (_, s) => `<script>${fs.readFileSync(path.join(root, s), "utf8").replace(/<\/script>/g, "<\\/script>")}</script>`);
  const dom = new JSDOM(html, {
    url: "http://localhost/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { w.matchMedia = () => ({ matches: true }); w.scrollTo = () => {}; w.confirm = () => true; w.alert = () => {}; },
  });
  return { w: dom.window, d: dom.window.document, errors };
}
const click = (w, el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const nav = (t, v) => t.d.querySelector(`#nav [data-v="${v}"]`);

test("e2e", { skip: !JSDOM && "jsdom not installed (npm i)" }, async (t) => {
  const ctx = boot();
  const { w, d } = ctx;
  const text = () => d.querySelector("#app").textContent;

  await t.test("home renders with unofficial label", () => {
    assert.match(text(), /Take your first quiz/);
    assert.match(d.body.textContent, /Unofficial/);
    assert.equal(d.querySelectorAll(".tile").length, 11);
  });

  await t.test("quick quiz: 10 questions with feedback, then results", () => {
    click(w, d.querySelector('[data-act="startQuick"]'));
    for (let i = 0; i < 10; i++) {
      assert.ok(d.querySelector(".opt"), `question ${i + 1} shows options`);
      click(w, d.querySelector('.opt[data-act="ans"]'));
      assert.match(d.querySelector("#fb").textContent, /Think of it like this/);
      click(w, d.querySelector('[data-act="next"]'));
    }
    assert.match(text(), /Quiz complete/);
    assert.ok(Object.keys(JSON.parse(w.localStorage.getItem("az900_unofficial_v2")).stats).length > 0, "progress saved");
  });

  await t.test("mock exam: answer, submit, see result", () => {
    click(w, nav(ctx, "mock"));
    click(w, d.querySelector('[data-act="startMock"]'));
    assert.match(text(), /Question 1 of 30/);
    click(w, d.querySelector('[data-act="mockPick"]'));
    click(w, d.querySelector('[data-act="submitMock"]'));
    assert.match(text(), /Mock exam result/);
    assert.match(text(), /Review/);
  });

  await t.test("flashcards: flip and rate", () => {
    click(w, nav(ctx, "cards"));
    assert.ok(d.querySelector(".flash"));
    click(w, d.querySelector('[data-act="flip"]'));
    click(w, d.querySelector('[data-act="rate"][data-ok="1"]'));
    assert.ok(d.querySelector(".flash") || /caught up/.test(text()));
  });

  await t.test("AI buddy works offline from built-in notes", () => {
    click(w, nav(ctx, "buddy"));
    click(w, d.querySelector('[data-act="suggest"]'));
    assert.match(d.querySelector("#chat").textContent, /Offline mode/);
  });

  await t.test("study plan builds from an exam date", () => {
    click(w, nav(ctx, "plan"));
    const exam = new Date(Date.now() + 14 * 864e5), k = `${exam.getFullYear()}-${String(exam.getMonth() + 1).padStart(2, "0")}-${String(exam.getDate()).padStart(2, "0")}`;
    d.querySelector("#pd").value = k;
    click(w, d.querySelector('[data-act="makePlan"]'));
    assert.ok(d.querySelectorAll("#pout tr").length >= 14);
    assert.match(d.querySelector("#pout").textContent, /mock exam/i);
  });

  await t.test("progress renders badges and history", () => {
    click(w, nav(ctx, "progress"));
    assert.match(text(), /By skill/);
    assert.ok(d.querySelectorAll(".bdg.on").length >= 1);
  });

  assert.deepEqual(ctx.errors, [], "no runtime errors in the page");
});
