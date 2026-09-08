'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Field = 'preferredHangoutMinutes' | 'bufferMinutes' | 'proposalsPerDay'

/**
 * Formatting lives here rather than being passed in: a function can't cross
 * from a Server Component into a Client one, and the shape of each value is
 * a property of the field anyway.
 */
function label(field: Field, n: number): string {
  if (field === 'proposalsPerDay') return String(n)
  if (n === 0) return 'None'
  return n >= 120 ? `${n / 60}h` : `${n}m`
}

/**
 * A row whose value is a small set of choices. Saves on tap — a settings
 * screen with a Save button is a settings screen you have to think about.
 */
export function PreferencePicker({
  field,
  value,
  options,
}: {
  field: Field
  value: number
  options: number[]
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(value)
  const [saving, setSaving] = useState(false)

  async function choose(next: number) {
    if (next === current || saving) return
    const previous = current
    setCurrent(next)
    setSaving(true)

    const res = await fetch('/api/me/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: next }),
    })

    // Put it back rather than showing a value that didn't save.
    if (!res.ok) setCurrent(previous)
    setSaving(false)
    router.refresh()
  }

  return (
    <span className="seg" role="group">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === current}
          onClick={() => choose(option)}
        >
          {label(field, option)}
        </button>
      ))}
    </span>
  )
}
