# Prompt engineering notes

Hackathon criterion: *"Are your AI prompts accurate, effective and purposeful?"* This is how the AI Study Buddy's prompts were designed.

## 1. Goals the prompt must meet
1. **Accurate:** stay on the AZ-900 outline, admit uncertainty, never invent features, prices or limits.
2. **Beginner-friendly:** plain words, one idea at a time, no jargon without explanation.
3. **Locally relevant:** analogies from everyday African life (mobile money, matatus, chamas, load-shedding, market stalls), varied and never stereotyping.
4. **Exam-useful:** always surface the distinction exams test (IaaS vs PaaS, LRS vs GRS, Policy vs RBAC, ExpressRoute vs VPN).
5. **Safe:** no reproducing or guessing real exam questions, no pretending to be Microsoft.
6. **Cheap and fast:** short answers (about 170 words) suit mobile screens, low bandwidth and a small model.
7. **Multilingual:** answer in the learner's language but keep Azure terms in English so they match the exam.

## 2. System prompt (in `backend/app/buddy.py`, called only from the server)
Structured in four blocks: **SCOPE**, **HOW TO ANSWER**, **RULES**, **language line**.
- *Scope* prevents drift and gives a graceful redirect.
- *How to answer* fixes a four-step shape: definition, African analogy, exam tip, and (for quiz review) why each wrong option fails. A fixed shape makes responses predictable and scannable.
- *Rules* encode honesty ("say so and point to Microsoft Learn"), the no-exam-questions policy and the "keep terms in English" rule.
- The language is injected as a parameter, so one prompt serves all eight languages.

## 3. Quiz-review prompt (`explainPrompt`)
Sends the question, all options, the correct answer and the learner's choice (right or wrong). Asking *"why are the others not right"* turns every answer into a mini lesson, which addresses the hackathon problem that learners do not understand why an answer is right or wrong.

## 4. Failure modes each rule guards against
These are the known weaknesses of "explain simply with African examples" style prompts, and the rule added for each. (Record your own live test results here after running the checklist below.)
| Risk | Rule that addresses it |
|---|---|
| Long, generic answers that do not suit phones | Word budget (~170 words) and a fixed four-step shape |
| The same market metaphor every time | "Vary them, never stereotype" with a list of different settings |
| Translating product names so they no longer match the exam | "Keep Azure product names and technical terms in English" |
| Confident but wrong claims about prices, limits or previews | "If unsure, say so and point to Microsoft Learn; these change" |
| Offering to write or recall real exam questions | "Never reproduce or guess real exam questions" |
| Drifting into general chat | Scope block with a polite redirect |

## 5. Evaluation checklist (run when changing the prompt)
- [ ] "Explain IaaS, PaaS and SaaS like I am new" → one definition, one analogy, one exam tip, under 170 words.
- [ ] "Give me the real exam questions" → polite refusal, offers study help instead.
- [ ] "What is the capital of Kenya?" → redirects to AZ-900.
- [ ] Same question in Kiswahili → Swahili sentences, English product names.
- [ ] "How much does a D2s v5 VM cost?" → admits prices change, points to the pricing calculator.
- [ ] Quiz review with a wrong answer → explains the right one and why the chosen one fails.

## 6. Prompting used while building (vibe coding with Claude)
- Fetched the official skills outline first and made the data model mirror its 11 sub-skills, so content is traceable to the outline.
- Asked Claude to write questions per sub-skill with the constraint "one unambiguous correct answer, three plausible distractors, explanation that states the principle, plus an African analogy", which must still be reviewed against Microsoft Learn before you rely on them.
- Wrote tests first for the pure logic (readiness, planner invariants) and asked Claude to fix code until they passed.
