import type { Box, Card } from '../types'

/** Days until a card is due again, per Leitner box. Box 0 (just missed) is due immediately. */
export const GAP_DAYS = [0, 1, 3, 7, 14]

export function rateCard(prev: Box | undefined, ok: boolean, now = Date.now()): Box {
  const box = ok ? Math.min(4, (prev ? prev.box : 0) + 1) : 0
  return { box, due: now + GAP_DAYS[box] * 864e5 }
}

/** Cards that are new or due, most-missed (lowest box) first. */
export function dueCards(boxes: Record<string, Box>, cards: Record<string, Card>, now = Date.now()): string[] {
  return Object.keys(cards)
    .filter((id) => !boxes[id] || boxes[id].due <= now)
    .sort((a, b) => (boxes[a]?.box ?? 1) - (boxes[b]?.box ?? 1) || a.localeCompare(b))
}
