'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * How many of this group have to be free before Spont proposes anything.
 *
 * Two was a global rule, and it isn't one — "any two of us" is right for
 * five-a-side and wrong for a book club, and only the group knows which it
 * is. The ceiling is however many have actually joined: asking for four of
 * you when three have accepted would just mean silence.
 */
export function GroupQuorum({
  groupId,
  value,
  memberCount,
}: {
  groupId: string
  value: number
  memberCount: number
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options = []
  for (let n = 2; n <= memberCount; n++) options.push(n)

  async function choose(next: number) {
    if (next === current || saving) return
    const previous = current
    setCurrent(next)
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minAttendees: next }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Could not save that.')
      setCurrent(previous)
    }
    setSaving(false)
    router.refresh()
  }

  // With two people there's nothing to choose — both of you is the only answer.
  if (options.length < 2) return null

  return (
    <>
      <div className="section-label">
        <span>Before Spont proposes</span>
      </div>
      <div className="panel">
        <div className="row">
          <span className="row-text">
            <span className="row-name">How many have to be free</span>
            <span className="row-sub">
              It won&rsquo;t wait for everyone unless you ask it to.
            </span>
          </span>
          <span className="seg" role="group" aria-label="How many have to be free">
            {options.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={n === current}
                onClick={() => choose(n)}
              >
                {n === memberCount ? 'All' : n}
              </button>
            ))}
          </span>
        </div>
      </div>
      {error && (
        <p className="note" style={{ color: 'var(--warn)' }}>
          {error}
        </p>
      )}
    </>
  )
}
