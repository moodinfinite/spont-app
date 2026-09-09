'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Both halves of the decision live together in one card, differing by weight
 * rather than position — the same shape a proposal uses, because this is the
 * same kind of question.
 */
export function GroupInviteResponse({
  membershipId,
  groupId,
  groupName,
  minAttendees,
  memberCount,
}: {
  membershipId: string
  groupId: string
  groupName: string
  minAttendees: number
  memberCount: number
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function respond(accept: boolean) {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/groups/members/${membershipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Could not send that. Try again.')
      setPending(false)
      return
    }
    // Accepting lands you inside the group you just joined; declining sends
    // you back to People, because there's nothing here for you any more.
    router.push(accept ? `/groups/${groupId}` : '/friends')
    router.refresh()
  }

  return (
    <>
      <div className="card-dark">
        <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.55 }}>
          {minAttendees >= memberCount + 1 ? (
            <>
              This group has asked Spont to wait until <b>all of you</b> are free.
            </>
          ) : (
            <>
              In a group, Spont proposes as soon as <b>any {minAttendees} of you</b> are free — it
              doesn&rsquo;t wait for everyone.
            </>
          )}{' '}
          It still only ever sees free or busy, never what any of you are doing.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-yes" disabled={pending} onClick={() => respond(true)}>
            {pending ? 'Just a sec…' : `Join ${groupName}`}
          </button>
          <button className="btn btn-no" disabled={pending} onClick={() => respond(false)}>
            No thanks
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
