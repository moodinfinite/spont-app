'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Member = {
  membershipId: string
  status: 'INVITED' | 'ACCEPTED' | 'DECLINED'
  role: 'OWNER' | 'MEMBER'
  user: { id: string; name: string }
}

export function GroupDetailClient({
  groupId,
  groupName,
  members,
  directory,
}: {
  groupId: string
  groupName: string
  members: Member[]
  directory: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function invite(userId: string) {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
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
    <main>
      <h1>{groupName}</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <h2>Members</h2>
      <ul>
        {members.map((m) => (
          <li key={m.membershipId}>
            {m.user.name} — {m.role.toLowerCase()} — {m.status.toLowerCase()}
          </li>
        ))}
      </ul>
      <h2>Invite someone</h2>
      <ul>
        {directory.map((u) => (
          <li key={u.id}>
            {u.name} <button disabled={pending} onClick={() => invite(u.id)}>Invite</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
