'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export function GroupsClient({ groups }: { groups: { id: string; name: string }[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createGroup() {
    if (!name.trim()) return
    setPending(true)
    setError(null)
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Something went wrong')
      setPending(false)
      return
    }
    setName('')
    setPending(false)
    router.refresh()
  }

  return (
    <main>
      <h1>Groups</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {groups.map((g) => (
          <li key={g.id}>
            <Link href={`/groups/${g.id}`}>{g.name}</Link>
          </li>
        ))}
      </ul>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" />
      <button disabled={pending} onClick={createGroup}>
        Create group
      </button>
    </main>
  )
}
