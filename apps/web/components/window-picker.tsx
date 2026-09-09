'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Preference = 'SOONEST' | 'BEST'

const LABELS: Record<Preference, string> = { SOONEST: 'Soonest', BEST: 'Roomiest' }

/**
 * When several windows fit, which one Spont picks.
 *
 * It was a hardcoded "soonest" — defensible for an app called Spont, but it
 * means a scrappy Tuesday 9pm always beats a wide-open Saturday, and which of
 * those you want isn't something the app can know about you. Soonest stays
 * the default; this is the way out of it.
 *
 * A time you marked "up for it" wins under either setting. That answer was
 * given deliberately and outranks a preference about shape.
 */
export function WindowPicker({ value }: { value: Preference }) {
  const router = useRouter()
  const [current, setCurrent] = useState<Preference>(value)
  const [saving, setSaving] = useState(false)

  async function choose(next: Preference) {
    if (next === current || saving) return
    const previous = current
    setCurrent(next)
    setSaving(true)

    const res = await fetch('/api/me/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ windowPreference: next }),
    })

    // Put it back rather than showing a value that didn't save.
    if (!res.ok) setCurrent(previous)
    setSaving(false)
    router.refresh()
  }

  return (
    <span className="seg" role="group" aria-label="Which window wins">
      {(Object.keys(LABELS) as Preference[]).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === current}
          onClick={() => choose(option)}
        >
          {LABELS[option]}
        </button>
      ))}
    </span>
  )
}
