'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * What deleting costs, in the sentence before it happens rather than the
 * screen after. The two numbers are the ones someone can't see from here:
 * how many other people lose the group, and how many arranged hangouts go
 * with it. A plain "Are you sure?" would ask for a decision while withholding
 * what the decision is about.
 */
export function deletionWarning(others: number, upcoming: number): string {
  const plans =
    upcoming === 0
      ? 'Nothing is arranged yet, so nothing gets cancelled.'
      : `It also cancels ${upcoming} hangout${upcoming === 1 ? '' : 's'} already arranged.`

  if (others === 0) return `You're the only one in it. ${plans}`
  return `It goes for the other ${others} of you too, not just for you. ${plans}`
}

/**
 * Shown only to whoever started the group. Everyone else gets nothing here —
 * an explanation of why they can't delete it would be a worse answer than
 * the control simply not being theirs.
 */
export function GroupDelete({
  groupId,
  groupName,
  memberCount,
  upcomingCount,
}: {
  groupId: string
  groupName: string
  memberCount: number
  upcomingCount: number
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setPending(true)
    setError(null)

    const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Could not delete that.')
      setPending(false)
      setConfirming(false)
      return
    }

    // Back to where the group was reached from. Not router.refresh() — the
    // page this button sits on has just stopped existing.
    router.push('/friends')
    router.refresh()
  }

  if (!confirming) {
    return (
      <>
        <div className="section-label">
          <span>Ending it</span>
        </div>
        <div className="panel">
          <button
            type="button"
            className="row-action danger"
            onClick={() => setConfirming(true)}
          >
            <span>Delete this group</span>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4.5 6h11m-8.5 0V4.75A1.25 1.25 0 0 1 8.25 3.5h3.5A1.25 1.25 0 0 1 13 4.75V6m2 0v9.25a1.25 1.25 0 0 1-1.25 1.25h-7.5A1.25 1.25 0 0 1 5 15.25V6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {error && (
          <p className="note" style={{ color: 'var(--warn)' }}>
            {error}
          </p>
        )}
      </>
    )
  }

  return (
    <>
      <div className="section-label">
        <span>Ending it</span>
      </div>
      <div className="panel">
        <div className="row">
          <span className="row-text">
            <span className="row-name">Delete {groupName}?</span>
            <span className="row-sub">
              {deletionWarning(Math.max(memberCount - 1, 0), upcomingCount)}
            </span>
          </span>
        </div>
        <div className="row" style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-no"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Keep it
          </button>
          <button
            type="button"
            className="btn btn-yes"
            style={{ background: 'var(--warn)', color: '#fff' }}
            disabled={pending}
            onClick={remove}
          >
            {pending ? 'Deleting…' : 'Delete'}
          </button>
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
