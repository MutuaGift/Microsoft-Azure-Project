// Exports the question bank (single source of truth) to JSON for the Python backend.
const fs = require("fs"), path = require("path");
const D = require("../legacy-static/js/data.js");
const out = path.join(__dirname, "..", "backend", "app", "data", "content.json");
fs.writeFileSync(out, JSON.stringify({ domains: D.DOMAINS, skills: D.SKILLS, questions: D.QUESTIONS, cards: D.CARDS, links: D.LINKS }, null, 1));
console.log("wrote", out, D.QUESTIONS.length, "questions,", Object.keys(D.CARDS).length, "cards");
