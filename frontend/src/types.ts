export type Question = { id: string; s: string; q: string; o: string[]; a: number; e: string; af: string; c: string }
export type Domain = { name: string; range: string; weight: number }
export type Skill = { d: string; name: string }
export type Card = [front: string, back: string, skill: string]
export type Content = {
  domains: Record<string, Domain>
  skills: Record<string, Skill>
  questions: Question[]
  cards: Record<string, Card>
  links: Record<string, string>
}

export type QStat = { right: number; wrong: number; last: boolean }
export type Box = { box: number; due: number }
export type HistoryItem = { d: number; type: 'quiz' | 'mock'; pct: number; n: number }
export type Persisted = {
  v: 3
  stats: Record<string, QStat>
  boxes: Record<string, Box>
  history: HistoryItem[]
  exam: string
  hours: number
  streak: { days: number; last: string }
  lang: string
}

export type SkillReport = { total: number; attempted: number; mastered: number; right: number; wrong: number; mastery: number; accuracy: number | null }
export type NextStep = { kind: 'quick_quiz' | 'mock' | 'cards' | 'skill'; title: string; detail: string; skill?: string }
export type Analytics = {
  readiness: number
  verdict: { level: 'ready' | 'close' | 'building'; text: string }
  domains: Record<string, { mastery: number; accuracy: number | null }>
  skills: Record<string, SkillReport>
  weak: string[]
  next_step: NextStep
  pass_mark: number
  ready_mark: number
}

export type PlanDay =
  | { kind: 'study'; skill: string; mins: { learn: number; quiz: number; cards: number } }
  | { kind: 'mock'; mins: { mock: number; review: number } }
  | { kind: 'review'; mins: { cards: number } }
export type Plan = { n?: number; exam_day?: boolean; total_minutes?: number; days: PlanDay[]; share?: Record<string, number> }

export type View = 'home' | 'practice' | 'mock' | 'cards' | 'buddy' | 'plan' | 'progress'
