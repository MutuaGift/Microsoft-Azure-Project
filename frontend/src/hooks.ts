import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { load, save } from './lib/stats'
import type { Analytics, Content, Persisted } from './types'

const CONTENT_KEY = 'az900_content_cache_v1'
const ANALYTICS_KEY = 'az900_analytics_cache_v1'

function readJSON<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null } catch { return null }
}
function writeJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

/** Learner progress, persisted to localStorage on every change. */
export function usePersisted(): [Persisted, (fn: (s: Persisted) => Persisted) => void] {
  const [state, setState] = useState<Persisted>(load)
  const update = useCallback((fn: (s: Persisted) => Persisted) => setState((s) => { const n = fn(s); save(n); return n }), [])
  return [state, update]
}

/** The content bank from the API, with the last good copy cached so the app still opens offline. */
export function useContent() {
  const [content, setContent] = useState<Content | null>(() => readJSON<Content>(CONTENT_KEY))
  const [error, setError] = useState<string | null>(null)
  const [tries, setTries] = useState(0)
  useEffect(() => {
    let live = true
    api.content().then((c) => { if (live) { setContent(c); setError(null); writeJSON(CONTENT_KEY, c) } })
      .catch((e: Error) => { if (live) setError(e.message) })
    return () => { live = false }
  }, [tries])
  return { content, error, retry: () => setTries((t) => t + 1) }
}

/** Server-computed readiness, debounced. Falls back to the last good result when offline. */
export function useAnalytics(stats: Persisted['stats'], dueCards: number) {
  const [an, setAn] = useState<Analytics | null>(() => readJSON<Analytics>(ANALYTICS_KEY))
  const [stale, setStale] = useState(false)
  const seq = useRef(0)
  useEffect(() => {
    const id = ++seq.current
    const t = setTimeout(() => {
      api.analytics(stats, dueCards).then((a) => {
        if (id !== seq.current) return
        setAn(a); setStale(false); writeJSON(ANALYTICS_KEY, a)
      }).catch(() => { if (id === seq.current) setStale(true) })
    }, 250)
    return () => clearTimeout(t)
  }, [stats, dueCards])
  return { an, stale }
}
