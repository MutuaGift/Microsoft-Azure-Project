import type { Analytics, Content, Plan, QStat } from './types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, body === undefined ? undefined : {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'You appear to be offline.')
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const j = await res.json()
      if (typeof j.detail === 'string') msg = j.detail
    } catch { /* not JSON */ }
    throw new ApiError(res.status, msg)
  }
  return res.json() as Promise<T>
}

export const api = {
  health: () => request<{ status: string; buddy: boolean; questions: number }>('/api/health'),
  content: () => request<Content>('/api/content'),
  analytics: (stats: Record<string, QStat>, dueCards: number) => request<Analytics>('/api/analytics', { stats, due_cards: dueCards }),
  mock: (n = 30) => request<{ ids: string[] }>('/api/mock', { n }),
  plan: (today: string, exam: string, hours: number, stats: Record<string, QStat>) => request<Plan>('/api/plan', { today, exam, hours, stats }),
  buddy: (messages: { role: 'user' | 'assistant'; content: string }[], lang: string) => request<{ reply: string }>('/api/buddy', { messages, lang }),
  explain: (questionId: string, picked: number, lang: string) => request<{ reply: string }>('/api/explain', { question_id: questionId, picked, lang }),
}

export const LANGUAGES = ['English', 'Kiswahili', 'Français', 'Hausa', 'Yorùbá', 'isiZulu', 'Amharic (አማርኛ)', 'Português']
