'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Weekdays and weekends are asked separately because they aren't the same
 * question — weekday time is carved up by work, weekend time by daylight.
 * 6pm Tuesday and 6pm Saturday are different propositions.
 */
const WEEKDAY = [
  ['wd-before', 'Before work'],
  ['wd-lunch', 'Lunch'],
  ['wd-after', 'Straight after work'],
  ['wd-evening', 'Evening'],
  ['wd-late', 'Late'],
] as const

const WEEKEND = [
  ['we-morning', 'Morning'],
  ['we-midday', 'Midday'],
  ['we-afternoon', 'Afternoon'],
  ['we-evening', 'Evening'],
  ['we-late', 'Late'],
] as const

type State = 'none' | 'yes' | 'never'
const NEXT: Record<State, State> = { none: 'yes', yes: 'never', never: 'none' }

/** Absent and 'none' mean the same thing, so a plain deep-equal won't do. */
function sameTimes(a: Record<string, State>, b: Record<string, State>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    if ((a[k] ?? 'none') !== (b[k] ?? 'none')) return false
  }
  return true
}

export function HangoutTimes({
  initial,
  onSaved,
  cta = 'Done',
}: {
  initial: Record<string, State>
  onSaved?: string
  cta?: string
}) {
  const router = useRouter()
  const [times, setTimes] = useState<Record<string, State>>(initial)
  /** What the server last confirmed, so the button knows if there's anything to do. */
  const [saved, setSaved] = useState<Record<string, State>>(initial)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = !sameTimes(times, saved)

  function cycle(key: string) {
    setJustSaved(false)
    setTimes((t) => ({ ...t, [key]: NEXT[t[key] ?? 'none'] }))
  }

  // The tick doesn't stay. It's a receipt, not a state.
  useEffect(() => {
    if (!justSaved) return
    const t = setTimeout(() => setJustSaved(false), 2200)
    return () => clearTimeout(t)
  }, [justSaved])

  async function save() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/me/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hangoutTimes: times }),
    })
    if (!res.ok) {
      setError('Could not save that. Try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    if (onSaved) {
      router.push(onSaved)
      router.refresh()
      return
    }
    // Everything else on this screen saves on tap and shows it immediately.
    // This button is the one thing that didn't say anything back.
    setSaved(times)
    setJustSaved(true)
    router.refresh()
  }

  const group = (rows: readonly (readonly [string, string])[]) => (
    <div className="buckets">
      {rows.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className="bucket"
          data-state={times[key] ?? 'none'}
          onClick={() => cycle(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )

  return (
    <div>
      <div className="legend">
        <span className="legend-item">
          <span className="legend-chip" data-state="none" /> No preference
        </span>
        <span className="legend-item">
          <span className="legend-chip" data-state="yes" /> Up for it
        </span>
        <span className="legend-item">
          <span className="legend-chip" data-state="never" /> Never
        </span>
      </div>
      <p className="bucket-hint">Tap a time to cycle through the three.</p>

      <p className="bucket-label">Weekdays</p>
      {group(WEEKDAY)}

      <p className="bucket-label">Weekends</p>
      {group(WEEKEND)}

      {error && (
        <p className="note" style={{ color: 'var(--warn)' }}>
          {error}
        </p>
      )}

      <button
        type="button"
        className={`btn btn-yes btn-save${justSaved ? ' is-saved' : ''}`}
        style={{ marginTop: 22 }}
        onClick={save}
        disabled={saving || (!dirty && !onSaved)}
      >
        <span className="save-label">
          {saving ? 'Saving…' : justSaved ? 'Saved' : dirty || onSaved ? cta : 'Up to date'}
        </span>
        <svg className="save-tick" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M4 10.5l4 4 8-9"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
