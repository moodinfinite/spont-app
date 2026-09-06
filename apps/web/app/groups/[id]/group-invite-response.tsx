'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function GroupInviteResponse({ membershipId }: { membershipId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function respond(accept: boolean) {
    setPending(true)
    await fetch(`/api/groups/members/${membershipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    })
    setPending(false)
    router.refresh()
  }

  return (
    <div>
      <button disabled={pending} onClick={() => respond(true)}>
        Accept
      </button>{' '}
      <button disabled={pending} onClick={() => respond(false)}>
        Decline
      </button>
    </div>
  )
}
