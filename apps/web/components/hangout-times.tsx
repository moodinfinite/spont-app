'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cycle(key: string) {
    setTimes((t) => ({ ...t, [key]: NEXT[t[key] ?? 'none'] }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/me/hangout-times', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hangoutTimes: times }),
    })
    if (!res.ok) {
      setError('Could not save that. Try again.')
      setSaving(false)
      return
    }
    if (onSaved) router.push(onSaved)
    router.refresh()
    setSaving(false)
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
        className="btn btn-yes"
        style={{ display: 'block', width: '100%', marginTop: 22 }}
        onClick={save}
        disabled={saving}
      >
        {saving ? 'Saving…' : cta}
      </button>
    </div>
  )
}
