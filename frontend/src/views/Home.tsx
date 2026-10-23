import type { Analytics, Content } from '../types'
import { pct } from '../lib/format'
import { Meter, Ring } from '../ui/Bits'

type Props = { content: Content; an: Analytics | null; go: (v: 'cards' | 'mock') => void; quiz: (scope: string, n: number) => void }

export default function Home({ content, an, go, quiz }: Props) {
  if (!an) return <div className="card">Loading your readiness…</div>
  const n = an.next_step
  const act = () => (n.kind === 'quick_quiz' ? quiz('all', 10) : n.kind === 'mock' ? go('mock') : n.kind === 'cards' ? go('cards') : quiz(`s:${n.skill}`, 10))
  const label = { quick_quiz: 'Start 10-question quiz', mock: 'Start mock exam', cards: 'Open flashcards', skill: 'Practise this skill' }[n.kind]
  return (
    <>
      <section className="card hero">
        <Ring value={an.readiness} level={an.verdict.level} />
        <div>
          <div className="mute">Your readiness</div>
          <h2 style={{ margin: 0 }}>{an.verdict.text}</h2>
          <p className="mute" style={{ margin: '.4rem 0 0' }}>
            Based on how many of the {content.questions.length} questions you currently answer correctly, weighted by exam skill areas.
            The real exam passes at 700/1000; we aim for {an.ready_mark}% as a safety margin.
          </p>
        </div>
      </section>
      <section className="card next">
        <div className="mute">Next best step</div>
        <h3>{n.title}</h3>
        <p className="mute">{n.detail}</p>
        <button className="btn primary" onClick={act}>{label}</button>
      </section>
      {Object.entries(content.domains).map(([d, dom]) => (
        <section className="card" key={d}>
          <div className="row"><h3 className="grow">{dom.name}</h3><span className="mute">exam weight {dom.range}</span></div>
          <div className="grid">
            {Object.entries(content.skills).filter(([, s]) => s.d === d).map(([id, s]) => {
              const r = an.skills[id], m = pct(r.mastery)
              return (
                <button key={id} className="tile" onClick={() => quiz(`s:${id}`, 10)}>
                  <div className="n">{s.name}</div><div className="pct">{m}%</div><Meter value={m} />
                  <div className="n">{r.attempted}/{r.total} tried</div>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <section className="card">
        <h3>Official resources</h3>
        <p className="row">
          <a className="btn sm" href={content.links.studyGuide} target="_blank" rel="noopener">AZ-900 skills outline</a>
          <a className="btn sm" href={content.links.certification} target="_blank" rel="noopener">Certification page</a>
          <a className="btn sm" href={content.links.practice} target="_blank" rel="noopener">Free Microsoft practice assessment</a>
          <a className="btn sm" href={content.links.sandbox} target="_blank" rel="noopener">Exam sandbox</a>
        </p>
        <p className="mute">This app is unofficial and its questions are original. Use Microsoft's own practice assessment and Learn modules alongside it.</p>
      </section>
    </>
  )
}
