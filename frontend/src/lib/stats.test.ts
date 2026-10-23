import { describe, expect, it } from 'vitest'
import { dueCards, rateCard } from './leitner'
import { emptyState, liveStreak, recordAnswer, touchStreak } from './stats'
import { offlineAnswer } from './offlineBuddy'
import type { Content, Question } from '../types'

const q: Question = { id: 'c1-opex', s: 'c1', q: '?', o: ['a', 'b', 'c', 'd'], a: 1, e: 'e', af: 'a', c: 'opex' }

describe('recordAnswer', () => {
  it('tracks the latest result and counts', () => {
    let s = recordAnswer(emptyState(), q, false)
    expect(s.stats[q.id]).toEqual({ right: 0, wrong: 1, last: false })
    s = recordAnswer(s, q, true)
    expect(s.stats[q.id]).toEqual({ right: 1, wrong: 1, last: true })
  })
  it('sends the missed flashcard back to box 0, due now', () => {
    const s0 = { ...emptyState(), boxes: { opex: { box: 3, due: 9e12 } } }
    expect(recordAnswer(s0, q, false, 5000).boxes.opex).toEqual({ box: 0, due: 5000 })
    expect(recordAnswer(s0, q, true).boxes.opex).toEqual({ box: 3, due: 9e12 })
  })
  it('does not mutate the previous state', () => {
    const s0 = emptyState()
    recordAnswer(s0, q, true)
    expect(s0.stats).toEqual({})
  })
})

describe('leitner', () => {
  it('promotes to box 4 at most and resets on a miss', () => {
    let b = undefined as ReturnType<typeof rateCard> | undefined
    for (let i = 0; i < 6; i++) b = rateCard(b, true, 0)
    expect(b).toEqual({ box: 4, due: 14 * 864e5 })
    expect(rateCard(b, false, 0).box).toBe(0)
  })
  it('lists new and due cards, most-missed first', () => {
    const cards = { a: ['a', '', 'c1'], b: ['b', '', 'c1'], c: ['c', '', 'c1'] } as Content['cards']
    const boxes = { a: { box: 3, due: 10 }, b: { box: 0, due: 5 }, c: { box: 2, due: 99 } }
    expect(dueCards(boxes, cards, 20)).toEqual(['b', 'a'])
    expect(dueCards({}, cards, 0)).toEqual(['a', 'b', 'c'])
  })
})

describe('streak', () => {
  it('counts consecutive days and resets after a gap', () => {
    let s = touchStreak(touchStreak(emptyState(), '2026-10-20'), '2026-10-20')
    expect(s.streak.days).toBe(1)
    s = touchStreak(s, '2026-10-21')
    expect(s.streak.days).toBe(2)
    s = touchStreak(s, '2026-10-24')
    expect(s.streak.days).toBe(1)
    expect(liveStreak(s, '2026-10-30')).toBe(0)
  })
})

describe('offlineAnswer', () => {
  const content = { cards: { iaas: ['IaaS', 'You rent VMs and manage the OS.', 'c3'] }, questions: [{ ...q, c: 'iaas', af: 'Renting an empty shop.' }] } as unknown as Content
  it('finds the matching card and analogy', () => {
    const a = offlineAnswer('what is iaas', content)
    expect(a).toContain('IaaS')
    expect(a).toContain('Renting an empty shop.')
  })
  it('admits when it has nothing', () => {
    expect(offlineAnswer('zzz qqq', content)).toContain('could not find')
  })
})
