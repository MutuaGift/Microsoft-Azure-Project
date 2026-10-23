# Pitch script and Canva slide plan

Template: the PLP Standard Pitch Deck (https://canva.link/os6usknbpkr6vmi). A filled-in draft following its slide order is in AZ900-Prep-Buddy-Pitch-PLP.pptx (Canva: Create a design → Import file). The older slide plan below is a longer script you can borrow from.
(Open it, click **Use this template** to make your own copy, then paste the text below into the matching slides. The template's own slide titles may differ slightly, so match by content.)

Pitch is scored on: Problem understanding 20% · Solution & product 25% · Target users 15% · Impact & scalability 20% · Clarity, design & delivery 20%.

## Slide 1: Title
**AZ-900 Prep Buddy (Unofficial)**
Quiz it. Understand it. Remember it. Plan it. Prove it.
Your name · #1MillionDevs Vibe Coding Hackathon.
Small print: unofficial, not affiliated with Microsoft.

## Slide 2: The problem (my AZ-900 journey)  [20%]
Fill in your own story here. Three honest pain points work best:
- I answered practice questions but did not know *why* I was wrong.
- Terms like IaaS/PaaS, LRS/GRS, Policy/RBAC blurred together and I forgot them.
- I did not know when I was ready, or how to split my time before the exam date.
- Data is expensive, and the examples in most courses are not from my world.

## Slide 3: Who it is for  [15%]
- Beginners and career-switchers across Africa preparing for AZ-900, often on a phone.
- Students and bootcamp cohorts (1M Devs learners) who study in groups.
- Secondary users: trainers who want a free practice tool for a class.

## Slide 4: The solution, one app, five challenges  [25%]
Quiz Builder · Flashcard Coach · Study Planner · AI Study Buddy · Readiness Tracker (+ mock exam).
One loop: **miss a question → get the why → the card returns tomorrow → readiness updates → the plan adapts.**

## Slide 5: Live demo (60-90 seconds)
1. Home: readiness ring, "Next best step".
2. Quiz: answer one wrong on purpose. Show explanation + African analogy. Tap "Explain it more".
3. Flashcards: the missed card is first in the queue.
4. Progress: readiness moves; weakest skill is highlighted.
5. Study plan: enter exam date, show weak skills getting more days, export to calendar.
6. AI Buddy: ask in Kiswahili.
Fallback if Wi-Fi fails: it works offline (PWA); the Buddy falls back to built-in notes.

## Slide 6: How it works (tech + prompts)  [Technical creativity, Prompt engineering]
- Content mirrors the **11 sub-skills of the official outline**, so every question traces to the exam objectives.
- Readiness = exam-weight × mastery, counting only your latest answers, so it cannot be gamed.
- Leitner spaced repetition tied to quiz misses.
- Planner: weakness-weighted, interleaved, with mock + review days.
- Claude-powered Buddy with a constrained system prompt (scope, structure, honesty, language rules). See PROMPTS.md.
- Zero dependencies, PWA, offline-first, 24 automated tests, CI to GitHub Pages.

## Slide 7: Impact and scalability  [20%]
- Works on low-end phones and weak connections: about 100 KB, offline after first load.
- Content is data and the engine is certification-agnostic: AI-900, SC-900, PL-900 next.
- Translations can be community-reviewed (language support already in the Buddy).
- Measure impact: readiness gained, streaks, mock pass rate, cohort pass rates.
- Roadmap: server proxy for the Buddy, adaptive difficulty, cohort leaderboards, trainer dashboard.

## Slide 8: Responsible and accurate
- All questions original and mapped to the public outline. No exam questions, no Microsoft logos.
- Clearly labelled unofficial. Points learners to Microsoft Learn and the free official practice assessment.
- AI answers carry a "verify with Microsoft Learn" note.

## Slide 9: Ask / thank you
Repo, live demo link, QR code. "You've studied the cloud. Now use the tool that helps the next learner pass."

## Delivery tips
- Lead with your own story for 20 seconds. Judges score "problem understanding" on whether it is real.
- Keep the demo under 90 seconds and rehearse the exact click path.
- Have the live URL open and a screenshot of each screen as backup.

---
## Verified statistics you can use (checked 23 Oct 2026)
- **27%** of the population of Sub-Saharan Africa uses mobile internet; **60% usage gap**, 13% coverage gap. GSMA, *State of Mobile Internet Connectivity 2024* (23 Oct 2024 press release): https://www.gsma.com/newsroom/press-release/new-gsma-report-shows-mobile-internet-connectivity-continues-to-grow-globally-but-barriers-for-3-45-billion-unconnected-people-remain/
- **~230 million** jobs in Sub-Saharan Africa will require digital skills by 2030, **~650 million** training opportunities, **$130 billion** opportunity to provide digital skills (IFC projection, May 2019, with L.E.K. Consulting): https://www.ifc.org/en/pressroom/2019/ifc-report-finds-130-billion-opportunity-in-digital-skills-across-sub-saharan-africa
- Not found: an official public count of AZ-900 exam takers. Do not quote one unless you can cite Microsoft.

## About slide 2 (your story)
Judges score "problem understanding" on whether it draws on YOUR AZ-900 experience, so use your real one. The draft deck contains an **illustrative learner persona**, clearly labelled as such, so the slide is not empty. Replace it with 2 true sentences from you. If you give me three facts (what confused you, how you studied, what you wished existed), I will write the slide text from them.
