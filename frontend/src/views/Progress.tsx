import { useRef } from 'react'
import type { Analytics, Content, Persisted } from '../types'
import { pct } from '../lib/format'
import { Meter, Ring } from '../ui/Bits'

type Props = {
  content: Content; an: Analytics | null; state: Persisted
  onReset: () => void; onImport: (s: Persisted) => void
}

function download(name: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export default function Progress({ content, an, state, onReset, onImport }: Props) {
  const file = useRef<HTMLInputElement>(null)
  if (!an) return <div className="card">Loading…</div>
  const h = state.history.slice(-12), W = 320, H = 70
  const pts = h.map((x, i) => `${h.length > 1 ? i * (W / (h.length - 1)) : W / 2},${H - (x.pct / 100) * (H - 10) - 5}`).join(' ')
  const passY = H - (an.pass_mark / 100) * (H - 10) - 5
  const badges: [string, string, boolean][] = [
    ['🌱', 'First steps', Object.keys(state.stats).length > 0],
    ['🔥', '3-day streak', state.streak.days >= 3],
    ['🧠', 'Card collector', Object.values(state.boxes).filter((b) => b.box >= 2).length >= 10],
    ['🎯', 'Perfect quiz', state.history.some((x) => x.type === 'quiz' && x.pct === 100 && x.n >= 10)],
    ['🧭', 'All-rounder', Object.values(an.skills).every((s) => s.mastery >= 0.5)],
    ['📝', 'Mock passed', state.history.some((x) => x.type === 'mock' && x.pct >= an.pass_mark)],
    ['🏆', 'Exam ready', an.readiness >= an.ready_mark],
  ]
  const importFile = (f: File) => {
    const r = new FileReader()
    r.onload = () => {
      try { const d = JSON.parse(String(r.result)); if (d.v !== 3 || typeof d.stats !== 'object') throw new Error(); onImport(d as Persisted) }
      catch { alert('That file is not a valid progress export.') }
    }
    r.readAsText(f)
  }
  return (
    <>
      <section className="card hero">
        <Ring value={an.readiness} level={an.verdict.level} />
        <div><h2 style={{ margin: 0 }}>{an.verdict.text}</h2>
          <p className="mute">Readiness counts a question as mastered when your most recent answer was correct. Questions you have not tried count as not mastered, so you cannot look ready by practising only your favourite topics.</p></div>
      </section>
      <section className="card"><h3>By exam area</h3>
        {Object.entries(content.domains).map(([d, dom]) => { const m = pct(an.domains[d].mastery); return <div key={d} style={{ marginBottom: 10 }}><div className="row"><span className="grow">{dom.name} <span className="mute">({dom.range})</span></span><b>{m}%</b></div><Meter value={m} /></div> })}
      </section>
      <section className="card"><h3>By skill</h3>
        <table className="table"><thead><tr><th>Skill</th><th>Mastered</th><th>Accuracy</th></tr></thead><tbody>
          {Object.entries(content.skills).map(([id, s]) => <tr key={id}><td>{s.name}</td><td>{an.skills[id].mastered}/{an.skills[id].total}</td><td>{an.skills[id].accuracy === null ? '–' : `${pct(an.skills[id].accuracy)}%`}</td></tr>)}
        </tbody></table>
      </section>
      <section className="card"><h3>Score history</h3>
        {h.length ? <><svg viewBox={`0 0 ${W} ${H}`} width="100%" height="80" role="img" aria-label={`Recent scores: ${h.map((x) => `${x.pct}%`).join(', ')}`}>
          <line x1="0" x2={W} y1={passY} y2={passY} stroke="var(--line)" strokeDasharray="4" /><polyline fill="none" stroke="var(--accent)" strokeWidth="3" points={pts} /></svg>
          <div className="mute">Dashed line = {an.pass_mark}% pass mark. Last {h.length} sessions.</div></> : <p className="mute">Finish a quiz to see your trend.</p>}
      </section>
      <section className="card"><h3>Badges</h3><div className="badges">{badges.map(([i, n, on]) => <div key={n} className={`bdg ${on ? 'on' : ''}`}><b>{i}</b>{n}</div>)}</div></section>
      <section className="card"><h3>Your data</h3><p className="mute">Stored only on this device. Export to back it up or move to another device.</p>
        <div className="row">
          <button className="btn" onClick={() => download('az900-progress.json', JSON.stringify(state, null, 2))}>Export</button>
          <button className="btn" onClick={() => file.current?.click()}>Import</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} />
          <button className="btn" onClick={() => { if (confirm('Reset all progress on this device?')) onReset() }}>Reset progress</button>
        </div></section>
    </>
  )
}
