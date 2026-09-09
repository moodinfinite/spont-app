'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AcceptInvite({
  inviterId,
  inviterName,
}: {
  inviterId: string
  inviterName: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function accept() {
    setPending(true)
    setError(null)
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: inviterId }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Could not send that. Try again.')
      setPending(false)
      return
    }
    router.push('/friends')
    router.refresh()
  }

  return (
    <>
      <div className="card-dark">
        <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.55 }}>
          Say yes and Spont starts looking for windows where you&rsquo;re both free. It only ever
          sees free or busy — never what either of you is doing.
        </p>
        <button
          className="btn btn-yes"
          style={{ display: 'block', width: '100%' }}
          onClick={accept}
          disabled={pending}
        >
          {pending ? 'Just a sec…' : `Add ${inviterName}`}
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
