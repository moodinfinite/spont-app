'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function GroupInviteResponse({ membershipId }: { membershipId: string }) {
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
      setError(body?.error?.message ?? 'Something went wrong')
      setPending(false)
      return
    }
    setPending(false)
    router.refresh()
  }

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button disabled={pending} onClick={() => respond(true)}>
        Accept
      </button>{' '}
      <button disabled={pending} onClick={() => respond(false)}>
        Decline
      </button>
    </div>
  )
}
