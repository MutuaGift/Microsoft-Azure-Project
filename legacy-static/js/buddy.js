/* AI Study Buddy: bring-your-own-key call to the Claude Messages API from the browser.
 * The key is stored only in this browser's localStorage and is sent only to api.anthropic.com.
 * For a production app, put a small server proxy in front instead (see README).
 * Prompt design is documented in PROMPTS.md. */
(function (root) {
  const MODEL = "claude-haiku-5-5";
  const ENDPOINT = "https://api.anthropic.com/v1/messages";

  const LANGUAGES = ["English", "Kiswahili", "Français", "Hausa", "Yorùbá", "isiZulu", "Amharic (አማርኛ)", "Português"];

  function systemPrompt(lang) {
    return [
      "You are AZ-900 Study Buddy, an unofficial, friendly tutor for people preparing for the Microsoft Azure Fundamentals (AZ-900) exam. Many learners are beginners in Africa studying on phones with limited data.",
      "",
      "SCOPE",
      "- Only help with topics on the public AZ-900 skills outline: cloud concepts, Azure architecture and services, Azure management and governance.",
      "- If asked about anything else, say so kindly in one sentence and offer an AZ-900 topic instead.",
      "",
      "HOW TO ANSWER (keep it under 170 words)",
      "1. One-sentence plain-language definition. No jargon without explaining it.",
      "2. A short analogy from everyday life in Africa (for example mobile money, matatus and boda-bodas, market stalls, load-shedding, chamas, airtime, shared kitchens). Vary them, and never stereotype.",
      "3. 'Exam tip': the one distinction the exam usually tests (for example IaaS vs PaaS, LRS vs GRS, Policy vs RBAC).",
      "4. If the learner is reviewing a quiz question, say why the correct option is right and, briefly, why each wrong option fails.",
      "",
      "RULES",
      "- Be accurate. If you are not sure, say so and point to Microsoft Learn rather than guessing. Prices, limits and preview features change.",
      "- Never reproduce or guess real exam questions. Never claim to be from Microsoft or to be official.",
      "- Keep Azure product names and technical terms in English (for example 'Availability Zone'), even when you write in another language.",
      `- Reply in ${lang}. If you are less confident in that language, keep sentences short and simple.`,
      "- Use at most one short list. No headings. Friendly, encouraging tone.",
    ].join("\n");
  }

  function explainPrompt(q, pickedText, correct) {
    return [
      "I am reviewing this practice question I wrote myself in a study app.",
      `Question: ${q.q}`,
      `Options: ${q.o.map((t, i) => `${String.fromCharCode(65 + i)}) ${t}`).join(" | ")}`,
      `Correct answer: ${q.o[q.a]}`,
      `I chose: ${pickedText}${correct ? " (correct)" : " (wrong)"}`,
      "Explain the concept in a way I will remember, and tell me why the other options are not right.",
    ].join("\n");
  }

  async function ask({ key, lang, messages, signal }) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system: systemPrompt(lang), messages }),
    });
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try { const j = await res.json(); if (j.error && j.error.message) msg = j.error.message; } catch (e) { /* ignore */ }
      throw new Error(res.status === 401 ? "That API key was rejected. Check it and try again." : msg);
    }
    const j = await res.json();
    return (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  }

  const api = { MODEL, LANGUAGES, systemPrompt, explainPrompt, ask };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AZ_BUDDY = api;
})(typeof window !== "undefined" ? window : globalThis);
