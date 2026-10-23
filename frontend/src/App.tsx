import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { useAnalytics, useContent, usePersisted } from './hooks'
import { dueCards, rateCard } from './lib/leitner'
import { emptyState, liveStreak, recordAnswer, touchStreak } from './lib/stats'
import type { Persisted, Question, View } from './types'
import { Confetti } from './ui/Bits'
import Buddy from './views/Buddy'
import Cards from './views/Cards'
import Home from './views/Home'
import Mock from './views/Mock'
import PlanView from './views/Plan'
import Practice from './views/Practice'
import Progress from './views/Progress'

const TABS: [View, string][] = [['home', 'Home'], ['practice', 'Practice'], ['mock', 'Mock exam'], ['cards', 'Flashcards'], ['buddy', 'AI Buddy'], ['plan', 'Study plan'], ['progress', 'Progress']]
const PASS_MARK = 70

export default function App() {
  const { content, error, retry } = useContent()
  const [state, update] = usePersisted()
  const [view, setView] = useState<View>('home')
  const [launch, setLaunch] = useState<{ scope: string; n: number; nonce: number } | null>(null)
  const [buddyOnline, setBuddyOnline] = useState(false)
  const [confetti, setConfetti] = useState(0)

  useEffect(() => { api.health().then((h) => setBuddyOnline(h.buddy)).catch(() => setBuddyOnline(false)) }, [])

  const due = useMemo(() => (content ? dueCards(state.boxes, content.cards).length : 0), [content, state.boxes])
  const { an, stale } = useAnalytics(state.stats, due)

  const go = useCallback((v: View) => { setLaunch(null); setView(v); window.scrollTo({ top: 0 }) }, [])
  const quiz = useCallback((scope: string, n: number) => { setLaunch({ scope, n, nonce: Date.now() }); setView('practice'); window.scrollTo({ top: 0 }) }, [])

  const onAnswer = useCallback((q: Question, ok: boolean) => update((s) => touchStreak(recordAnswer(s, q, ok))), [update])
  const onFinish = useCallback((pct: number, n: number) => {
    update((s) => ({ ...s, history: [...s.history, { d: Date.now(), type: 'quiz' as const, pct, n }].slice(-40) }))
    if (pct >= 80) setConfetti((c) => c + 1)
  }, [update])
  const onMock = useCallback((rows: { q: Question; ok: boolean }[], pct: number) => {
    update((s) => {
      let n: Persisted = s
      for (const r of rows) n = recordAnswer(n, r.q, r.ok)
      return touchStreak({ ...n, history: [...n.history, { d: Date.now(), type: 'mock' as const, pct, n: 30 }].slice(-40) })
    })
    if (pct >= PASS_MARK) setConfetti((c) => c + 1)
  }, [update])
  const onRate = useCallback((id: string, ok: boolean) => update((s) => touchStreak({ ...s, boxes: { ...s.boxes, [id]: rateCard(s.boxes[id], ok) } })), [update])

  if (!content) {
    return (
      <div className="wrap center"><div>
        <h1>☁️ AZ-900 Prep Buddy <span className="badge">Unofficial</span></h1>
        {error ? <><p className="err">{error}</p><button className="btn primary" onClick={retry}>Try again</button></> : <p className="mute">Loading…</p>}
      </div></div>
    )
  }

  const weakest = an?.weak[0] ?? Object.keys(content.skills)[0]
  return (
    <>
      <a className="skip" href="#app">Skip to content</a>
      <header className="top">
        <div className="wrap bar">
          <div className="brand"><img src="/icon.svg" alt="" width="32" height="32" /><div><b>AZ-900 Prep Buddy</b><span className="badge">Unofficial</span></div></div>
          <div><span className="chip" title="Days in a row you practised">🔥 {liveStreak(state)}</span><span className="chip" title="Flashcards due">🧠 {due}</span></div>
        </div>
        <nav className="wrap" id="nav" aria-label="Main">
          {TABS.map(([k, n]) => <button key={k} className={k === view ? 'on' : ''} aria-current={k === view ? 'page' : undefined} onClick={() => go(k)}>{n}</button>)}
        </nav>
      </header>
      <main className="wrap" id="app" tabIndex={-1}>
        {stale && <div className="note">You are offline or the server is unreachable. Showing your last saved readiness.</div>}
        {view === 'home' && <Home content={content} an={an} go={go} quiz={quiz} />}
        {view === 'practice' && <Practice content={content} stats={state.stats} lang={state.lang} buddyOnline={buddyOnline} launch={launch} weakest={weakest} onAnswer={onAnswer} onFinish={onFinish} go={go} />}
        {view === 'mock' && <Mock content={content} history={state.history} passMark={an?.pass_mark ?? PASS_MARK} onSubmit={onMock} go={go} />}
        {view === 'cards' && <Cards content={content} boxes={state.boxes} onRate={onRate} go={go} />}
        {view === 'buddy' && <Buddy content={content} lang={state.lang} setLang={(lang) => update((s) => ({ ...s, lang }))} online={buddyOnline} />}
        {view === 'plan' && <PlanView content={content} state={state} setPrefs={(exam, hours) => update((s) => ({ ...s, exam, hours }))} />}
        {view === 'progress' && <Progress content={content} an={an} state={state} onReset={() => { update(() => emptyState()); go('home') }} onImport={(d) => { update(() => ({ ...emptyState(), ...d })); go('progress') }} />}
      </main>
      <footer className="wrap foot">
        Unofficial study tool, not affiliated with or endorsed by Microsoft. All questions are original and follow the public{' '}
        <a href={content.links.studyGuide} target="_blank" rel="noopener">AZ-900 skills outline</a> on Microsoft Learn. Always check the{' '}
        <a href={content.links.certification} target="_blank" rel="noopener">official certification page</a> for the latest exam details. Progress is saved only on your device.
      </footer>
      <Confetti fire={confetti} />
    </>
  )
}
