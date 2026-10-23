import type { Persisted, Question } from '../types'

export const STORAGE_KEY = 'az900_unofficial_v3'

export const emptyState = (): Persisted => ({
  v: 3, stats: {}, boxes: {}, history: [], exam: '', hours: 1.5, streak: { days: 0, last: '' }, lang: 'English',
})

export function dayKey(ms = Date.now()): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysBetween(a: string, b: string): number {
  const p = (k: string) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d) }
  return Math.round((p(b) - p(a)) / 864e5)
}

/** Records one answer. A miss sends the question's flashcard back to box 0, due now. */
export function recordAnswer(s: Persisted, q: Question, correct: boolean, now = Date.now()): Persisted {
  const prev = s.stats[q.id] ?? { right: 0, wrong: 0, last: false }
  const stats = { ...s.stats, [q.id]: { right: prev.right + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1), last: correct } }
  const boxes = correct || !q.c ? s.boxes : { ...s.boxes, [q.c]: { box: 0, due: now } }
  return { ...s, stats, boxes }
}

export function touchStreak(s: Persisted, today = dayKey()): Persisted {
  if (s.streak.last === today) return s
  const days = s.streak.last && daysBetween(s.streak.last, today) === 1 ? s.streak.days + 1 : 1
  return { ...s, streak: { days, last: today } }
}

export function liveStreak(s: Persisted, today = dayKey()): number {
  return s.streak.last && daysBetween(s.streak.last, today) <= 1 ? s.streak.days : 0
}

export function load(): Persisted {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (raw && raw.v === 3) return { ...emptyState(), ...raw }
  } catch { /* storage blocked or corrupt */ }
  return emptyState()
}

export function save(s: Persisted): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
