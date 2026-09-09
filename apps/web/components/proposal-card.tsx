'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * One thing Spont found. The inverted ground is the system's voice — this
 * came from the engine, not from a person — and it's why a feed of
 * suggestions doesn't become a wall of neon.
 *
 * Design: docs/superpowers/mockups/2026-09-06-home-feed-mockup-v2-rounded.html
 */

/**
 * Long enough to catch a mis-tap, short enough not to feel like a
 * confirmation dialog. Nothing is written to anyone's calendar until it has
 * run out — which is the whole reason the window exists.
 */
const UNDO_MS = 5000

export function ProposalCard({
  id,
  headline,
  reason,
  day,
  time,
}: {
  id: string
  headline: string
  reason: string
  day: string
  time: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [draining, setDraining] = useState(false)

  async function answer(accept: boolean) {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/proposals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    })
    setPending(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Could not send that. Try again.')
      return false
    }
    return true
  }

  async function accept() {
    if (await answer(true)) setAccepted(true)
  }

  async function undo() {
    if (await answer(false)) {
      setAccepted(false)
      router.refresh()
    }
  }

  // The ring drains, then the card hands over to the server and becomes an
  // Upcoming row.
  useEffect(() => {
    if (!accepted) return
    const start = setTimeout(() => setDraining(true), 20)
    const done = setTimeout(() => router.refresh(), UNDO_MS)
    return () => {
      clearTimeout(start)
      clearTimeout(done)
    }
  }, [accepted, router])

  if (accepted) {
    return (
      <div className="card-dark card-suggested">
        <div className="sug-top">
          <span className="sug-eyebrow">You&rsquo;re in</span>
        </div>
        <h3 className="card-headline">{headline}</h3>
        <div className="stat-row">
          <span>{day}</span>
          <span>{time}</span>
        </div>
        <div className="undo-row">
          <button className="btn btn-no" onClick={undo} disabled={pending}>
            Undo
          </button>
          <svg className="undo-ring" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="track" cx="12" cy="12" r="10" />
            <circle className={`sweep${draining ? ' draining' : ''}`} cx="12" cy="12" r="10" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="card-dark card-suggested">
      <div className="sug-top">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="9.5" cy="12" r="5" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="14.5" cy="12" r="5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <span className="sug-eyebrow">Suggested</span>
      </div>

      <h3 className="card-headline">{headline}</h3>
      <p className="sug-reason">{reason}</p>

      <div className="stat-row">
        <span>{day}</span>
        <span>{time}</span>
      </div>

      <div className="card-actions">
        <button className="btn btn-yes" onClick={accept} disabled={pending}>
          I&rsquo;m in
        </button>
        <button className="btn btn-no" onClick={() => answer(false).then((ok) => ok && router.refresh())} disabled={pending}>
          Not this time
        </button>
      </div>

      {error && (
        <p className="note" style={{ color: 'var(--warn)', marginBottom: 0 }}>
          {error}
        </p>
      )}
    </div>
  )
}
