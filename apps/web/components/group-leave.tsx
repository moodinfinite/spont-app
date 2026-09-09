'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Leaving is quieter than deleting, and the copy should say so. Nothing
 * happens to anyone else's group — the only thing at stake is your own place
 * in it, and you can be invited back. So this confirms in one line rather
 * than counting up what's about to be lost the way deleting does.
 */
export function leaveWarning(upcoming: number): string {
  if (upcoming === 0) return 'The group carries on without you. You can be invited back.'
  return `You'll come off ${upcoming} arranged hangout${
    upcoming === 1 ? '' : 's'
  }. The group carries on without you.`
}

/**
 * Shown to everyone in the group except whoever started it — they get
 * "Delete this group" instead, since for them the two would be the same act.
 */
export function GroupLeave({
  groupId,
  upcomingCount,
}: {
  groupId: string
  upcomingCount: number
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function leave() {
    setPending(true)
    setError(null)

    const res = await fetch(`/api/groups/${groupId}/members`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Could not leave that group.')
      setPending(false)
      setConfirming(false)
      return
    }

    // This page is no longer ours to look at.
    router.push('/friends')
    router.refresh()
  }

  return (
    <>
      <div className="section-label">
        <span>Your place in it</span>
      </div>
      <div className="panel">
        {confirming ? (
          <>
            <div className="row">
              <span className="row-text">
                <span className="row-name">Leave this group?</span>
                <span className="row-sub">{leaveWarning(upcomingCount)}</span>
              </span>
            </div>
            <div className="row" style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-no"
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                Stay
              </button>
              <button
                type="button"
                className="btn btn-yes"
                style={{ background: 'var(--warn)', color: '#fff' }}
                disabled={pending}
                onClick={leave}
              >
                {pending ? 'Leaving…' : 'Leave'}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="row-action danger"
            onClick={() => setConfirming(true)}
          >
            <span>Leave this group</span>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M12.5 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h6a1.5 1.5 0 0 0 1.5-1.5v-1.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M8 10h9m0 0-2.5-2.5M17 10l-2.5 2.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      {error && (
        <p className="note" style={{ color: 'var(--warn)' }}>
          {error}
        </p>
      )}
    </>
  )
}
