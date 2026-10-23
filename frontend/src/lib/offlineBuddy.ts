import type { Content } from '../types'

/** Keyword lookup over the built-in flashcards. Used when the server-side AI is unavailable. */
export function offlineAnswer(text: string, content: Content): string {
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)
  let best: string | null = null
  let score = 0
  for (const id of Object.keys(content.cards)) {
    const [front, back] = content.cards[id]
    const hay = `${front} ${back}`.toLowerCase()
    const sc = words.reduce((a, w) => a + (hay.includes(w) ? 1 : 0), 0) + (words.some((w) => front.toLowerCase().includes(w)) ? 2 : 0)
    if (sc > score) { score = sc; best = id }
  }
  if (!best) return 'I could not find that in my offline notes. Try the Flashcards tab, or ask again when the AI Buddy is online.'
  const q = content.questions.find((x) => x.c === best)
  const [front, back] = content.cards[best]
  return `**${front}**\n${back}${q ? `\n\n🌍 ${q.af}` : ''}\n\n(Offline notes. The AI Buddy gives fuller explanations in your language when it is online.)`
}
