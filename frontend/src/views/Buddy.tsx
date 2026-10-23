import { useEffect, useRef, useState } from 'react'
import { LANGUAGES, api } from '../api'
import { offlineAnswer } from '../lib/offlineBuddy'
import type { Content } from '../types'
import { MdLite } from '../ui/Bits'

const SUGGEST = ['Explain IaaS, PaaS and SaaS like I am new', 'What is an availability zone?', 'Azure Policy vs RBAC: what is the difference?', 'Why is ExpressRoute different from a VPN?', 'Give me a memory trick for LRS, ZRS and GRS']
type Msg = { role: 'user' | 'assistant'; content: string }
type Props = { content: Content; lang: string; setLang: (l: string) => void; online: boolean }

export default function Buddy({ content, lang, setLang, online }: Props) {
  const [chat, setChat] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [chat, pending])

  const send = async (raw: string) => {
    const t = raw.trim()
    if (!t || pending) return
    const history: Msg[] = [...chat, { role: 'user', content: t.slice(0, 1500) }]
    setChat(history); setText(''); setPending(true)
    let reply: string
    try {
      reply = online ? (await api.buddy(history.slice(-8), lang)).reply : offlineAnswer(t, content)
    } catch (e) {
      reply = `⚠️ ${(e as Error).message}\n\n${offlineAnswer(t, content)}`
    }
    setChat([...history, { role: 'assistant', content: reply }]); setPending(false)
  }

  return (
    <section className="card">
      <h2>🤖 AI Study Buddy</h2>
      <p className="mute">Ask about any AZ-900 concept. Answers use simple words and real-life African examples, in the language you choose. Technical terms stay in English so they match the exam.</p>
      <div className="row">
        <label>Language <select value={lang} onChange={(e) => setLang(e.target.value)}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select></label>
        <span className="chip">{online ? '🟢 AI online' : '⚪ Offline notes only'}</span>
      </div>
      {!online && <p className="note" style={{ marginTop: 10 }}>The AI is not available on this server right now, so answers come from the built-in notes.</p>}
      <p className="mute" style={{ fontSize: '.8rem' }}>Non-English answers may contain mistakes. Double-check with Microsoft Learn.</p>
      <div className="sugg">{SUGGEST.map((s) => <button key={s} className="btn sm" onClick={() => send(s)}>{s}</button>)}</div>
      <div className="chat" aria-live="polite">
        {chat.length === 0 && <div className="msg ai">Hi! I am your unofficial AZ-900 study buddy. What would you like to understand today?</div>}
        {chat.map((m, i) => <div key={i} className={`msg ${m.role === 'user' ? 'me' : 'ai'}`}><MdLite text={m.content} /></div>)}
        {pending && <div className="msg ai">Thinking…</div>}
        <div ref={end} />
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <textarea rows={2} value={text} maxLength={1500} placeholder="Type your question…" aria-label="Your question"
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text) } }} />
        <button className="btn primary" disabled={pending} onClick={() => send(text)}>Send</button>
      </div>
    </section>
  )
}
