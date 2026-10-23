import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { dayKey } from '../lib/stats'
import type { Content, Persisted, Plan } from '../types'

type Props = { content: Content; state: Persisted; setPrefs: (exam: string, hours: number) => void }
const mins = (x: number) => (x >= 60 ? `${Math.floor(x / 60)}h${x % 60 ? ` ${x % 60}m` : ''}` : `${x}m`)

function icsOf(plan: Plan, content: Content, today: string): string {
  const [y, m, d] = today.split('-').map(Number)
  const f = (t: Date) => t.toISOString().slice(0, 10).replace(/-/g, '')
  const ev = plan.days.map((day, k) => {
    const s = new Date(Date.UTC(y, m - 1, d + k)), e = new Date(s.getTime() + 864e5)
    const title = day.kind === 'study' ? `AZ-900: ${content.skills[day.skill].name}` : day.kind === 'mock' ? 'AZ-900: mock exam' : 'AZ-900: light review'
    return ['BEGIN:VEVENT', `UID:az900-${f(s)}@prep-buddy`, `DTSTAMP:${f(new Date())}T000000Z`, `DTSTART;VALUE=DATE:${f(s)}`, `DTEND;VALUE=DATE:${f(e)}`, `SUMMARY:${title}`, 'END:VEVENT'].join('\r\n')
  })
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AZ-900 Prep Buddy (unofficial)//EN', ...ev, 'END:VCALENDAR'].join('\r\n')
}

export default function PlanView({ content, state, setPrefs }: Props) {
  const [exam, setExam] = useState(state.exam)
  const [hours, setHours] = useState(state.hours)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [today, setToday] = useState(dayKey())
  const [error, setError] = useState<string | null>(null)
  const auto = useRef(Boolean(state.exam))

  const build = async () => {
    if (!exam) { setError('Please pick your exam date.'); return }
    setError(null)
    const t = dayKey(); setToday(t); setPrefs(exam, hours)
    try { setPlan(await api.plan(t, exam, hours, state.stats)) } catch (e) { setPlan(null); setError((e as Error).message) }
  }
  useEffect(() => { if (auto.current) { auto.current = false; build() } }) // eslint-disable-line react-hooks/exhaustive-deps

  const label = (k: number) => {
    const [y, m, d] = today.split('-').map(Number)
    return new Date(y, m - 1, d + k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  }
  const download = () => {
    if (!plan) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([icsOf(plan, content, today)], { type: 'text/calendar' }))
    a.download = 'az900-study-plan.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <section className="card">
      <h2>Study plan</h2>
      <p className="mute">Enter your exam date and daily study time. Weaker skills get more days, and the plan ends with a mock exam and a light review.</p>
      <div className="row" style={{ margin: '12px 0' }}>
        <label>Exam date <input type="date" value={exam} min={dayKey()} onChange={(e) => setExam(e.target.value)} /></label>
        <label>Hours per day <input type="number" min={0.5} max={12} step={0.5} value={hours} style={{ width: 80 }} onChange={(e) => setHours(Number(e.target.value))} /></label>
        <button className="btn primary" onClick={build}>Build plan</button>
      </div>
      {error && <div className="err">{error}</div>}
      {plan?.exam_day && <><h3>It is exam day! 🍀</h3><p>Skim your flashcards, drink water, and trust your preparation.</p></>}
      {plan && !plan.exam_day && plan.n && (
        <>
          <p><b>{plan.n} day{plan.n > 1 ? 's' : ''}</b> to go · <b>{((plan.total_minutes ?? 0) / 60).toFixed(1)} study hours</b> in total.</p>
          <table className="table"><thead><tr><th>Day</th><th>Focus</th></tr></thead><tbody>
            {plan.days.map((d, k) => (
              <tr key={k}><td style={{ whiteSpace: 'nowrap' }}>{label(k)}</td><td>
                {d.kind === 'review' && `Light review: flashcards only (${mins(d.mins.cards)}). Sleep early.`}
                {d.kind === 'mock' && `Timed mock exam (${mins(d.mins.mock)})${d.mins.review ? `, then review every mistake (${mins(d.mins.review)})` : ''}`}
                {d.kind === 'study' && <><b>{content.skills[d.skill].name}</b><br /><span className="mute">Read the Microsoft Learn module {mins(d.mins.learn)} · topic quiz {mins(d.mins.quiz)} · flashcards {mins(d.mins.cards)}</span></>}
              </td></tr>))}
          </tbody></table>
          <p className="mute">Time by need: {Object.entries(plan.share ?? {}).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${content.skills[s].name} (${n}d)`).join(' · ')}.</p>
          <div className="row"><button className="btn" onClick={download}>📅 Add to calendar (.ics)</button><button className="btn" onClick={() => window.print()}>🖨 Print</button></div>
        </>
      )}
    </section>
  )
}
