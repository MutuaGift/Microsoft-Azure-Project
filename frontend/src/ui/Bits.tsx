import { useEffect, useState } from 'react'
import { tone } from '../lib/format'



export function Meter({ value }: { value: number }) {
  return <div className={`meter ${tone(value)}`} role="img" aria-label={`${value}%`}><i style={{ width: `${value}%` }} /></div>
}

export function Ring({ value, level }: { value: number; level: 'ready' | 'close' | 'building' }) {
  const c = 2 * Math.PI * 64
  const [shown, setShown] = useState(0)
  useEffect(() => { const t = requestAnimationFrame(() => setShown(value)); return () => cancelAnimationFrame(t) }, [value])
  return (
    <div className={`ring lvl-${level}`} role="img" aria-label={`Readiness ${value} percent`}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle className="track" cx="75" cy="75" r="64" fill="none" strokeWidth="14" />
        <circle className="val" cx="75" cy="75" r="64" fill="none" stroke="var(--lvl)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} />
      </svg>
      <div className="num" style={{ color: 'var(--lvl)' }}><div>{value}%<small>readiness</small></div></div>
    </div>
  )
}

/** Minimal markdown: **bold** and line breaks. Text is rendered as React nodes, never as HTML. */
export function MdLite({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <span key={i}>
          {line.split(/(\*\*.+?\*\*)/g).map((part, j) => (/^\*\*.+\*\*$/.test(part) ? <b key={j}>{part.slice(2, -2)}</b> : part))}
          <br />
        </span>
      ))}
    </>
  )
}

export function Confetti({ fire }: { fire: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!fire || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setOn(true)
    const t = setTimeout(() => setOn(false), 3600)
    return () => clearTimeout(t)
  }, [fire])
  const set = ['🎉', '☁️', '✨', '🌍', '🚀', '⭐']
  return (
    <div id="confetti" aria-hidden="true">
      {on && Array.from({ length: 28 }, (_, i) => (
        <span key={i} style={{ left: `${(i * 37) % 100}vw`, animationDelay: `${(i % 8) * 0.1}s` }}>{set[i % set.length]}</span>
      ))}
    </div>
  )
}
