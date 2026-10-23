import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { shuffle } from '../lib/stats'
import type { Content, HistoryItem, Question } from '../types'
import { Meter } from '../ui/Bits'

const MINUTES = 30
type Props = {
  content: Content
  history: HistoryItem[]
  passMark: number
  onSubmit: (rows: { q: Question; ok: boolean }[], pct: number) => void
  go: (v: 'progress') => void
}
type Run = { ids: string[]; order: Record<string, number[]>; ans: Record<string, number>; i: number; endAt: number }
type Row = { q: Question; given: number | null; ok: boolean }

export default function Mock({ content, history, passMark, onSubmit, go }: Props) {
  const [run, setRun] = useState<Run | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [result, setResult] = useState<{ p: number; rows: Row[]; byDomain: Record<string, [number, number]>; auto: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setError(null); setResult(null)
    let ids: string[]
    try { ids = (await api.mock(30)).ids } catch (e) { setError(`${(e as Error).message} The mock exam needs the server.`); return }
    setRun({ ids, order: Object.fromEntries(ids.map((id) => [id, shuffle([0, 1, 2, 3])])), ans: {}, i: 0, endAt: Date.now() + MINUTES * 60000 })
  }

  const submit = useCallback((auto: boolean) => {
    if (!run) return
    const unanswered = run.ids.filter((id) => run.ans[id] === undefined).length
    if (!auto && unanswered && !confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return
    const byDomain: Record<string, [number, number]> = Object.fromEntries(Object.keys(content.domains).map((d) => [d, [0, 0]]))
    let right = 0
    const rows: Row[] = run.ids.map((id) => {
      const q = content.questions.find((x) => x.id === id)!
      const pos = run.ans[id]
      const given = pos === undefined ? null : run.order[id][pos]
      const ok = given === q.a
      const d = content.skills[q.s].d
      byDomain[d][1]++
      if (ok) { right++; byDomain[d][0]++ }
      return { q, given, ok }
    })
    const p = Math.round((right / run.ids.length) * 100)
    setResult({ p, rows, byDomain, auto })
    setRun(null)
    onSubmit(rows.filter((r) => r.given !== null).map((r) => ({ q: r.q, ok: r.ok })), p)
  }, [run, content, onSubmit])

  useEffect(() => {
    if (!run) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [run])
  useEffect(() => { if (run && now >= run.endAt) submit(true) }, [now, run, submit])

  if (result) {
    const passed = result.p >= passMark
    return (
      <section className="card">
        <div className="mute">{result.auto ? 'Time is up. ' : ''}Mock exam result</div>
        <div style={{ fontSize: '2.6rem', fontWeight: 800, color: passed ? 'var(--good)' : 'var(--bad)' }}>{result.p}% <span style={{ fontSize: '1.1rem' }}>{passed ? 'PASS (simulated)' : 'Not yet'}</span></div>
        <p className="mute">Pass mark {passMark}%.</p>
        {Object.entries(content.domains).map(([d, dom]) => { const [r, n] = result.byDomain[d]; return <div key={d}>{dom.name}: {r}/{n}<Meter value={n ? Math.round((r / n) * 100) : 0} /></div> })}
        <h3 style={{ marginTop: 16 }}>Review</h3>
        {result.rows.map((r, k) => (
          <details key={r.q.id}>
            <summary>{r.ok ? '✅' : r.given === null ? '⚪' : '❌'} {k + 1}. {r.q.q}</summary>
            <p>{r.given === null ? <i>Not answered. </i> : <><b>Your answer:</b> {r.q.o[r.given]}<br /></>}<b>Correct:</b> {r.q.o[r.q.a]}<br />{r.q.e}</p>
            <div className="africa">🌍 {r.q.af}</div>
          </details>
        ))}
        <div className="row" style={{ marginTop: 14 }}><button className="btn primary" onClick={start}>Retake (new mix)</button><button className="btn" onClick={() => go('progress')}>Progress</button></div>
      </section>
    )
  }

  if (run) {
    const id = run.ids[run.i], q = content.questions.find((x) => x.id === id)!, order = run.order[id], n = run.ids.length
    const left = Math.max(0, run.endAt - now)
    const mm = String(Math.floor(left / 60000)).padStart(2, '0'), ss = String(Math.floor(left / 1000) % 60).padStart(2, '0')
    const goTo = (k: number) => setRun({ ...run, i: Math.max(0, Math.min(n - 1, k)) })
    return (
      <section className="card">
        <div className="row"><span className="grow mute">Question {run.i + 1} of {n}</span><span>⏱ <span className={`timer ${left < 5 * 60000 ? 'low' : ''}`}>{mm}:{ss}</span></span></div>
        <div className="dots" role="group" aria-label="Question navigator">
          {run.ids.map((x, k) => <button key={x} className={`dot ${run.ans[x] !== undefined ? 'done' : ''} ${k === run.i ? 'cur' : ''}`} aria-label={`Question ${k + 1}`} onClick={() => goTo(k)}>{k + 1}</button>)}
        </div>
        <h3 id="qtext">{q.q}</h3>
        <div role="group" aria-labelledby="qtext">
          {order.map((k, pos) => <button key={pos} className={`opt ${run.ans[id] === pos ? 'sel' : ''}`} onClick={() => setRun({ ...run, ans: { ...run.ans, [id]: pos } })}><span className="k">{'ABCD'[pos]}</span>{q.o[k]}</button>)}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" disabled={run.i === 0} onClick={() => goTo(run.i - 1)}>← Back</button>
          {run.i < n - 1 && <button className="btn primary" onClick={() => goTo(run.i + 1)}>Next →</button>}
          <span className="grow" /><button className="btn" onClick={() => submit(false)}>Submit exam</button>
        </div>
      </section>
    )
  }

  const recent = history.filter((h) => h.type === 'mock').slice(-5)
  return (
    <section className="card">
      <h2>Mock exam</h2>
      {error && <div className="err">{error}</div>}
      <p>30 questions in {MINUTES} minutes, balanced across the three skill areas like the real exam. No feedback until you submit. Pass mark {passMark}%.</p>
      <p className="mute">A simulation to practise pacing, not a prediction. The real exam also has other question types. Try Microsoft's free <a href={content.links.sandbox} target="_blank" rel="noopener">exam sandbox</a> to see them.</p>
      <button className="btn primary" onClick={start}>Start mock exam</button>
      {recent.length > 0 && <><h3 style={{ marginTop: 18 }}>Recent attempts</h3><p>{recent.map((h, i) => <span key={i} className="chip">{h.pct >= passMark ? '✅' : '❌'} {h.pct}%</span>)}</p></>}
    </section>
  )
}
