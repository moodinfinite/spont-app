'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export function GroupsClient({ groups }: { groups: { id: string; name: string }[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)

  async function createGroup() {
    if (!name.trim()) return
    setPending(true)
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setName('')
    setPending(false)
    router.refresh()
  }

  return (
    <main>
      <h1>Groups</h1>
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
