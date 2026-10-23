import { useEffect, useState } from 'react'
import { dueCards } from '../lib/leitner'
import type { Content, Persisted } from '../types'

type Props = { content: Content; boxes: Persisted['boxes']; onRate: (id: string, ok: boolean) => void; go: (v: 'practice') => void }

export default function Cards({ content, boxes, onRate, go }: Props) {
  // The queue is fixed when the tab opens; "still learning" cards are re-queued at the back.
  const [deck, setDeck] = useState<string[]>(() => dueCards(boxes, content.cards))
  const [flipped, setFlipped] = useState(false)
  const id = deck[0]

  const rate = (ok: boolean) => {
    if (!id) return
    onRate(id, ok)
    setDeck((d) => (ok ? d.slice(1) : [...d.slice(1), id]))
    setFlipped(false)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!id || ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return
      if (e.key === ' ' && !flipped) { e.preventDefault(); setFlipped(true) }
      else if (flipped && (e.key === '1' || e.key === '2')) rate(e.key === '2')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  if (!id) {
    const learned = Object.values(boxes).filter((b) => b.box >= 3).length
    return (
      <section className="card">
        <h2>All caught up 🎉</h2>
        <p className="mute">No flashcards are due right now. {learned} of {Object.keys(content.cards).length} cards are in the long-term boxes. Take a quiz to find new weak spots: every miss sends its card back here.</p>
        <button className="btn primary" onClick={() => go('practice')}>Practise</button>
      </section>
    )
  }
  const [front, back, skill] = content.cards[id]
  const missed = boxes[id]?.box === 0
  return (
    <section className="card">
      <div className="row"><span className="grow mute">{content.skills[skill].name}{missed ? ' · ⚠️ you missed this' : ''}</span><span className="mute">{deck.length} due</span></div>
      <div className="flash" role="button" tabIndex={0} aria-label="Flip card" onClick={() => setFlipped(true)} onKeyDown={(e) => { if (e.key === 'Enter') setFlipped(true) }}>
        {flipped ? <div>{back}</div> : <div><b>{front}</b><div className="mute" style={{ marginTop: 8 }}>Tap or press Space to reveal</div></div>}
      </div>
      <div className="row" style={{ justifyContent: 'center', visibility: flipped ? 'visible' : 'hidden' }}>
        <button className="btn" onClick={() => rate(false)}>😕 Still learning (1)</button>
        <button className="btn primary" onClick={() => rate(true)}>✅ I knew it (2)</button>
      </div>
      <p className="mute" style={{ textAlign: 'center' }}>Spaced repetition: cards you know return after 1, 3, 7 then 14 days. Cards you miss come back now.</p>
    </section>
  )
}
