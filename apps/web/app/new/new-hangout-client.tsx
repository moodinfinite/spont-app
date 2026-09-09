'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

/**
 * Asking for a hangout, in two questions: who, then when.
 *
 * Who comes first because it's the one you already know the answer to — you
 * open this screen because a particular person is on your mind. When is the
 * part Spont is for, so it isn't a picker: the app reads the calendars and
 * offers times everyone can actually make. Choosing between three real
 * windows is a smaller job than choosing from a month of squares, and it
 * can't produce a time somebody is busy.
 *
 * Design: docs/superpowers/mockups/2026-09-06-create-flow-mockup.html
 */

type Friend = { id: string; name: string }

type Window = { startsAt: string; endsAt: string; wanted: boolean }

const initial = (name: string) => name.trim().charAt(0).toUpperCase()

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long', month: 'short', day: 'numeric' })
const TIME = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })

/** "6:00–8:00 pm" — one meridiem where both ends share it, as on the feed. */
function timeLabel(start: Date, end: Date): string {
  const from = TIME.format(start)
  const to = TIME.format(end)
  const suffix = to.slice(-2)
  return from.endsWith(suffix) ? `${from.slice(0, -3)}–${to}` : `${from}–${to}`
}

/** Who this is with, in the words you'd use out loud. */
function nameList(names: string[]): string {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function NewHangoutClient({ friends }: { friends: Friend[] }) {
  const router = useRouter()
  const [picked, setPicked] = useState<string[]>([])
  const [windows, setWindows] = useState<Window[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chosenNames = friends.filter((f) => picked.includes(f.id)).map((f) => f.name)

  function toggle(id: string) {
    setPicked((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    )
    // The times on screen were for a different set of people.
    setWindows(null)
    setError(null)
  }

  async function findTimes() {
    setBusy(true)
    setError(null)

    const res = await fetch('/api/proposals/windows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: picked }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Could not look for times just now.')
      setBusy(false)
      return
    }

    const body = await res.json()
    setWindows(body.windows ?? [])
    setBusy(false)
  }

  async function send(window: Window) {
    setBusy(true)
    setError(null)

    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds: picked,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Could not send that.')
      setBusy(false)
      return
    }

    // It lands in Upcoming, waiting on them — so that's where to look.
    router.push('/')
    router.refresh()
  }

  if (friends.length === 0) {
    return (
      <main className="page">
        <header className="page-head">
          <h1>
            Who do you
            <br />
            want to see?
          </h1>
        </header>
        <div className="panel" style={{ textAlign: 'center', padding: '34px 24px' }}>
          <p
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: 21,
              letterSpacing: '-0.015em',
              margin: '0 0 6px',
            }}
          >
            Nobody yet.
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
            Spont can&rsquo;t propose anything until someone else is on it.
          </p>
        </div>
        <p className="note">
          <Link href="/friends">Add your people</Link>
        </p>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="page-head">
        <h1>
          Who do you
          <br />
          want to see?
        </h1>
      </header>

      <div className="panel">
        {friends.map((friend) => {
          const on = picked.includes(friend.id)
          return (
            <button
              type="button"
              className="row pick"
              key={friend.id}
              aria-pressed={on}
              disabled={busy}
              onClick={() => toggle(friend.id)}
            >
              <span className="person-avatar">{initial(friend.name)}</span>
              <span className="person-name">{friend.name}</span>
              <span className="pick-mark" aria-hidden="true">
                <svg viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2.5 7.5 5.5 10.5 11.5 4"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          )
        })}
      </div>

      {picked.length > 0 && !windows && (
        <div style={{ marginTop: 14 }}>
          <button
            className="btn btn-yes"
            style={{ width: '100%' }}
            disabled={busy}
            onClick={findTimes}
          >
            {busy ? 'Reading calendars…' : `Find a time for ${nameList(chosenNames)}`}
          </button>
        </div>
      )}

      {windows && windows.length > 0 && (
        <>
          <div className="section-label">
            <span>When everyone&rsquo;s free</span>
            <span>{windows.length}</span>
          </div>
          <div className="panel">
            {windows.map((w) => {
              const start = new Date(w.startsAt)
              const end = new Date(w.endsAt)
              return (
                <button
                  type="button"
                  className="row pick"
                  key={w.startsAt}
                  disabled={busy}
                  onClick={() => send(w)}
                >
                  <span className="row-text">
                    <span className="row-name">{DAY.format(start)}</span>
                    {w.wanted && <span className="row-sub">A time you said you&rsquo;re up for.</span>}
                  </span>
                  <span className="upcoming-when">{timeLabel(start, end)}</span>
                </button>
              )
            })}
          </div>
          <p className="note">
            Pick one and it goes to {nameList(chosenNames)}. Nothing is on anyone&rsquo;s calendar
            until they say yes.
          </p>
        </>
      )}

      {windows && windows.length === 0 && (
        <>
          <div className="panel" style={{ marginTop: 14, padding: '26px 22px' }}>
            <p
              style={{
                fontFamily: "'Sora', system-ui, sans-serif",
                fontWeight: 400,
                fontSize: 21,
                letterSpacing: '-0.015em',
                margin: '0 0 6px',
              }}
            >
              No window in the next 30 days.
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
              {picked.length > 1
                ? 'Nothing lines up for all of you at once. Fewer people usually finds one.'
                : 'Your calendars don’t overlap anywhere Spont would suggest.'}
            </p>
          </div>
          <p className="note">Change who&rsquo;s coming and try again.</p>
        </>
      )}

      {error && (
        <p className="note" style={{ color: 'var(--warn)' }}>
          {error}
        </p>
      )}
    </main>
  )
}
