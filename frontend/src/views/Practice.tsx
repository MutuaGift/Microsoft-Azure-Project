import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { shuffle } from '../lib/stats'
import type { Content, Persisted, Question } from '../types'
import { MdLite, Meter } from '../ui/Bits'

type Props = {
  content: Content
  stats: Persisted['stats']
  lang: string
  buddyOnline: boolean
  launch: { scope: string; n: number; nonce: number } | null
  weakest: string
  onAnswer: (q: Question, ok: boolean) => void
  onFinish: (pct: number, n: number) => void
  go: (v: 'cards' | 'progress' | 'buddy') => void
}
type Run = { ids: string[]; i: number; score: number; missed: string[] }
type Cur = { order: number[]; picked: number }

export default function Practice({ content, stats, lang, buddyOnline, launch, weakest, onAnswer, onFinish, go }: Props) {
  const [scope, setScope] = useState('all')
  const [count, setCount] = useState(10)
  const [run, setRun] = useState<Run | null>(null)
  const [cur, setCur] = useState<Cur | null>(null)
  const [empty, setEmpty] = useState(false)
  const [done, setDone] = useState<{ score: number; n: number; missed: string[] } | null>(null)
  const [help, setHelp] = useState<{ loading?: boolean; text?: string; error?: string } | null>(null)

  const start = useCallback((sc: string, n: number) => {
    const pool = content.questions.filter((q) =>
      sc === 'mistakes' ? stats[q.id] && !stats[q.id].last
        : sc.startsWith('d:') ? content.skills[q.s].d === sc.slice(2)
          : sc.startsWith('s:') ? q.s === sc.slice(2) : true)
    setDone(null); setHelp(null)
    if (!pool.length) { setEmpty(true); return }
    setEmpty(false)
    const ids = shuffle(pool).slice(0, n).map((q) => q.id)
    setRun({ ids, i: 0, score: 0, missed: [] })
    setCur({ order: shuffle([0, 1, 2, 3]), picked: -1 })
  }, [content, stats])

  // A launch request (from Home) starts a run once per nonce.
  useEffect(() => { if (launch) start(launch.scope, launch.n) }, [launch?.nonce]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = run && cur ? content.questions.find((x) => x.id === run.ids[run.i]) ?? null : null
  const answered = cur ? cur.picked >= 0 : false

  const pick = useCallback((pos: number) => {
    if (!run || !cur || !q || cur.picked >= 0) return
    const ok = cur.order[pos] === q.a
    onAnswer(q, ok)
    setCur({ ...cur, picked: pos })
    setRun({ ...run, score: run.score + (ok ? 1 : 0), missed: ok ? run.missed : [...run.missed, q.id] })
  }, [run, cur, q, onAnswer])

  const next = useCallback(() => {
    if (!run) return
    setHelp(null)
    if (run.i + 1 >= run.ids.length) {
      setDone({ score: run.score, n: run.ids.length, missed: run.missed })
      onFinish(Math.round((run.score / run.ids.length) * 100), run.ids.length)
      setRun(null); setCur(null)
    } else {
      setRun({ ...run, i: run.i + 1 })
      setCur({ order: shuffle([0, 1, 2, 3]), picked: -1 })
    }
  }, [run, onFinish])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.metaKey || e.ctrlKey || !q) return
      if (!answered && e.key.length === 1) {
        const pos = '1234'.includes(e.key) ? Number(e.key) - 1 : 'abcd'.indexOf(e.key.toLowerCase())
        if (pos >= 0) pick(pos)
      } else if (answered && (e.key === 'Enter' || e.key === 'ArrowRight') && tag !== 'BUTTON') { e.preventDefault(); next() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [q, answered, pick, next])

  const explain = async () => {
    if (!q || !cur) return
    setHelp({ loading: true })
    try { setHelp({ text: (await api.explain(q.id, cur.order[cur.picked], lang)).reply }) }
    catch (e) { setHelp({ error: (e as Error).message }) }
  }

  const skillName = useMemo(() => (id: string) => content.skills[id].name, [content])

  if (done) {
    const p = Math.round((done.score / done.n) * 100)
    return (
      <section className="card">
        <div className="mute">Quiz complete</div>
        <div style={{ fontSize: '2.4rem', fontWeight: 800 }}>{done.score}/{done.n} <span className="mute" style={{ fontSize: '1.2rem' }}>({p}%)</span></div>
        <p>{p >= 80 ? 'Excellent work! 🎉' : p >= 60 ? 'Good effort. Review the ones you missed below.' : 'Keep going. Missed terms are now waiting in your flashcards.'}</p>
        {done.missed.length > 0 && <>
          <h3>To review</h3>
          {done.missed.map((id) => { const m = content.questions.find((x) => x.id === id)!; return (
            <details key={id}><summary>{m.q}</summary><p><b>Answer:</b> {m.o[m.a]}<br />{m.e}</p></details>) })}
        </>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => setDone(null)}>Another quiz</button>
          <button className="btn" onClick={() => go('cards')}>Flashcards</button>
          <button className="btn" onClick={() => go('progress')}>See progress</button>
        </div>
      </section>
    )
  }

  if (run && cur && q) {
    const ok = answered && cur.order[cur.picked] === q.a
    const last = run.i + 1 >= run.ids.length
    return (
      <section className="card">
        <div className="row">
          <span className="mute grow">{skillName(q.s)} · {run.i + 1}/{run.ids.length}</span>
          <span className="mute">Score {run.score}</span>
          <button className="btn sm" onClick={() => { setRun(null); setCur(null) }}>Quit</button>
        </div>
        <Meter value={(run.i / run.ids.length) * 100} />
        <h3 style={{ marginTop: 14 }} id="qtext">{q.q}</h3>
        <div role="group" aria-labelledby="qtext">
          {cur.order.map((k, pos) => {
            const cls = answered ? (k === q.a ? 'right' : pos === cur.picked ? 'wrong' : '') : ''
            return <button key={pos} className={`opt ${cls}`} disabled={answered} onClick={() => pick(pos)}><span className="k">{'ABCD'[pos]}</span>{q.o[k]}</button>
          })}
        </div>
        <div aria-live="polite">
          {answered && (
            <div className="fb">
              <p><b style={{ color: ok ? 'var(--good)' : 'var(--bad)' }}>{ok ? '✅ Correct!' : '❌ Not quite.'}</b> {q.e}</p>
              <div className="africa">🌍 <b>Think of it like this:</b> {q.af}</div>
              {help && <div className="buddybox" style={help.error ? { color: 'var(--bad)' } : undefined}>
                {help.loading ? 'Thinking…' : help.error ? help.error : <>🤖 <MdLite text={help.text ?? ''} /></>}</div>}
              <div className="row">
                <button className="btn primary" autoFocus onClick={next}>{last ? 'See results' : 'Next'} →</button>
                {buddyOnline
                  ? <button className="btn" onClick={explain}>🤖 Explain it more</button>
                  : <button className="btn" onClick={() => go('buddy')}>🤖 Ask the Buddy (offline notes)</button>}
              </div>
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="card">
      <h2>Practice</h2>
      <p className="mute">Answer, get instant feedback and an explanation, plus a real-life African analogy for every question.</p>
      {empty && <div className="note">Nothing here yet. If you chose "My mistakes", you have none recorded. Nice!</div>}
      <div className="row" style={{ margin: '12px 0' }}>
        <select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Topic">
          <option value="all">All topics (mixed)</option>
          <option value="mistakes">My mistakes (last answer wrong)</option>
          {Object.entries(content.domains).map(([d, dom]) => (
            <optgroup key={d} label={dom.name}>
              <option value={`d:${d}`}>Whole area: {dom.name}</option>
              {Object.entries(content.skills).filter(([, s]) => s.d === d).map(([id, s]) => <option key={id} value={`s:${id}`}>{s.name}</option>)}
            </optgroup>
          ))}
        </select>
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} aria-label="Number of questions">
          <option value={10}>10 questions</option><option value={20}>20 questions</option><option value={999}>All</option>
        </select>
        <button className="btn primary" onClick={() => start(scope, count)}>Start</button>
      </div>
      <button className="btn sm" onClick={() => start(`s:${weakest}`, 10)}>⚡ Drill my weakest skill: {skillName(weakest)}</button>
    </section>
  )
}
