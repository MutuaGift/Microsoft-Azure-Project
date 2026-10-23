# ☁️ AZ-900 Prep Buddy (Unofficial)

> Quiz it. Understand it. Remember it. Plan it. Prove it.
> An exam-prep companion for **Microsoft Azure Fundamentals (AZ-900)**, built for learners across Africa: **React + TypeScript** front end, **Python (FastAPI)** back end.

**Unofficial.** Not affiliated with or endorsed by Microsoft. All 81 questions are original, written for this project and mapped to the public skills outline. No real exam questions, no Microsoft logos.

Built for the #1MillionDevs **Vibe Coding Hackathon: AZ-900 Exam Prep Edition**. It was built with AI assistance (Claude); see [AI assistance](#ai-assistance-and-review).

| | |
|---|---|
| Live demo | _add your deployed URL here_ |
| Pitch deck | PLP Standard Pitch Deck template: https://canva.link/os6usknbpkr6vmi (draft: `AZ900-Prep-Buddy-Pitch-PLP.pptx`) |
| Official skills outline | [Microsoft Learn: Study guide for Exam AZ-900](https://aka.ms/AZ900-StudyGuide) |
| Official certification page | [Microsoft Certified: Azure Fundamentals](https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/?practice-assessment-type=certification) |
| Free official practice | [Microsoft practice assessment](https://learn.microsoft.com/en-us/credentials/certifications/exams/az-900/practice/assessment?assessment-type=practice&assessmentId=23) |

## The problem
Learners practise with questions but do not understand *why* an answer is right or wrong, forget terms, do not know how to plan their time, and cannot tell when they are ready. Many study on phones with limited data, and abstract cloud ideas feel foreign.

Context (sources checked 23 Oct 2026):
- Only **27%** of people in Sub-Saharan Africa use mobile internet, with a **60% usage gap**: [GSMA, State of Mobile Internet Connectivity 2024](https://www.gsma.com/newsroom/press-release/new-gsma-report-shows-mobile-internet-connectivity-continues-to-grow-globally-but-barriers-for-3-45-billion-unconnected-people-remain/). That is why this app is small and works offline.
- IFC projects about **230 million** jobs in Sub-Saharan Africa will require digital skills by 2030, with nearly 650 million training opportunities (a 2019 projection): [IFC, Digital Skills in Sub-Saharan Africa](https://www.ifc.org/en/pressroom/2019/ifc-report-finds-130-billion-opportunity-in-digital-skills-across-sub-saharan-africa).
- We did not find a verified public count of AZ-900 candidates, so none is claimed.

## What it does (all five challenges, one product)
| Challenge | Feature |
|---|---|
| 📝 Smart Quiz Builder | 81 original questions across all **11 sub-skills** of the three exam areas. Instant feedback, an explanation for every answer, and a real-life **African analogy** for each. Practise by area, skill or "my mistakes". |
| 🧠 Flashcard Coach | 74 cards on **Leitner spaced repetition** (1 / 3 / 7 / 14 days). A missed quiz question sends its card straight back to the front of the queue. |
| 📅 Study Planner | Exam date + hours per day → a day-by-day plan. Weak skills get more days, topics are interleaved, and it ends with a mock exam and a light review day. Export to calendar (.ics). |
| 🤖 AI Study Buddy | Simple explanations with African examples in 8 languages, powered by Claude **through the server** (no key in the browser, rate-limited). Falls back to offline notes. Also explains any quiz question in more depth. |
| 📊 Readiness Tracker | Readiness % weighted by the exam's skill-area weights, mastery per sub-skill, score history, streaks and badges. |
| ➕ Mock exam | 30 questions in 30 minutes, balanced like the exam, review with explanations, 70% pass mark. |

## Architecture
```
┌──────────── React + TypeScript (Vite) ────────────┐        ┌──────────── FastAPI (Python) ────────────┐
│ Views: Home, Practice, Mock, Flashcards, Buddy,   │  JSON  │ GET  /api/content    question bank        │
│        Plan, Progress                             │ ─────▶ │ POST /api/analytics  readiness, next step │
│ Local state (localStorage): answers, Leitner      │        │ POST /api/mock       weighted mock exam   │
│ boxes, streak, history. Content + analytics are   │ ◀───── │ POST /api/plan       study planner        │
│ cached so the app opens offline.                  │        │ POST /api/buddy      Claude proxy         │
└───────────────────────────────────────────────────┘        │ POST /api/explain    quiz-review proxy    │
                                                             └───────────────────────────────────────────┘
```
- **Stateless server, no accounts.** Progress lives on the learner's device; the client sends its stats and gets analytics back. Nothing personal is stored.
- **One source of truth for the maths.** Readiness, mock building and the planner live in Python (`backend/app`) and are unit tested; the UI does not re-implement them.
- **Server-side AI.** The Anthropic key (`ANTHROPIC_API_KEY`) stays on the server. Inputs are validated and bounded (language allow-list, message count and length), `/api/explain` builds its prompt from the server's own question bank so clients cannot inject arbitrary text, and requests are rate-limited per client.
- Interactive API docs at `/api/docs`.

```
backend/app/        content.py analytics.py mock.py planner.py buddy.py schemas.py main.py   (+ data/content.json)
backend/tests/      pytest: content integrity, logic, API (with a fake AI client)
frontend/src/       views/, ui/, lib/ (leitner, stats, offline buddy), api.ts, hooks.ts, App.tsx
e2e/smoke.mjs       real-browser click-through of every tab
legacy-static/      earlier dependency-free build, kept as an offline-first fallback (own tests)
scripts/            export_content.js (content bank → backend JSON)
docs/               PROMPTS.md (prompt engineering), PITCH.md
```

## Run it
**Development**
```bash
# terminal 1: API
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp ../.env.example ../.env   # optional: add ANTHROPIC_API_KEY to enable the AI Buddy
uvicorn app.main:app --reload --port 8000

# terminal 2: web app (proxies /api to :8000)
cd frontend && npm install && npm run dev      # http://localhost:5173
```
**Production-like (one origin):** `cd frontend && npm run build`, then run uvicorn; FastAPI serves `frontend/dist`.
**Docker:** `docker build -t az900-prep . && docker run -p 8000:8000 -e ANTHROPIC_API_KEY=... az900-prep`.
**Deploy:** `render.yaml` is included (Render, free plan, Docker). Set `ANTHROPIC_API_KEY` as a secret. Without it the Buddy runs in offline mode.
**Static fallback:** `legacy-static/` needs no server; the included `pages.yml` publishes it to GitHub Pages.

## Tests
| Suite | Command | What it covers |
|---|---|---|
| Backend (25) | `cd backend && python -m pytest` | content integrity, readiness maths, mock balance, planner invariants, API validation, rate limiting, prompt construction |
| Frontend (8) | `cd frontend && npm test` | answer recording, Leitner boxes, streaks, offline buddy |
| Browser e2e (8 checks) | `cd e2e && npm i && npm test` (server running) | quiz, mock exam, flashcards, buddy, planner, progress, persistence, zero console errors |
| Legacy (24) | `cd legacy-static && npm i && npm test` | the static fallback build |

CI (`.github/workflows/ci.yml`) runs all four.

## Why the readiness score is honest
A question counts as **mastered when your most recent answer was correct**. Unattempted questions count as *not* mastered, so you cannot look ready by repeating easy topics, and fixing a mistake raises your score immediately. Readiness = Σ (exam-area weight × average skill mastery). We call you "ready" at 80%, a safety margin above the real 700/1000 pass mark.

## Accuracy and content policy
- Mapped to the public AZ-900 outline, "Skills measured as of July 20, 2026" (the topics, not the exam questions).
- Every question, option and explanation was written for this project. None come from the real exam, braindumps or Microsoft's practice assessment.
- Azure changes. Check [Microsoft Learn](https://learn.microsoft.com/credentials/certifications/azure-fundamentals/) for the latest and use Microsoft's free practice assessment as a final check.
- Non-English AI answers can contain mistakes. Learners are told to verify.

## AI assistance and review
This project was built with Claude as a pair-programmer: it drafted the question bank, code, tests and docs, and generated the draft pitch deck. Prompt design for the in-app AI Buddy is documented in [docs/PROMPTS.md](docs/PROMPTS.md). Questions and explanations should be reviewed against Microsoft Learn before relying on them. **Known gap:** the Buddy's live Claude calls are covered by tests with a fake client but have not yet been exercised against the real API in this repo; run the checklist in `docs/PROMPTS.md` before demoing it.

## Roadmap
More questions per skill, community-reviewed translations, adaptive difficulty, persisted rate limiting, and the same engine for AI-900, SC-900 and other fundamentals exams (the content is data; the engine is certification-agnostic).
