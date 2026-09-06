'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type UserSummary = { id: string; name: string; email: string }

export function FriendsClient({
  accepted,
  incoming,
  outgoing,
  directory,
}: {
  accepted: UserSummary[]
  incoming: { id: string; from: UserSummary }[]
  outgoing: { id: string; to: UserSummary }[]
  directory: UserSummary[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function sendRequest(toUserId: string) {
    setPending(true)
    await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId }),
    })
    setPending(false)
    router.refresh()
  }

  async function respond(friendshipId: string, accept: boolean) {
    setPending(true)
    await fetch(`/api/friends/${friendshipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    })
    setPending(false)
    router.refresh()
  }

  return (
    <main>
      <h1>Friends</h1>

      <section>
        <h2>Your friends</h2>
        <ul>
          {accepted.map((u) => (
            <li key={u.id}>{u.name}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Requests waiting on you</h2>
        <ul>
          {incoming.map((r) => (
            <li key={r.id}>
              {r.from.name}{' '}
              <button disabled={pending} onClick={() => respond(r.id, true)}>
                Accept
              </button>{' '}
              <button disabled={pending} onClick={() => respond(r.id, false)}>
                Decline
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Sent, awaiting response</h2>
        <ul>
          {outgoing.map((r) => (
            <li key={r.id}>{r.to.name}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>People you can add</h2>
        <ul>
          {directory.map((u) => (
            <li key={u.id}>
              {u.name}{' '}
              <button disabled={pending} onClick={() => sendRequest(u.id)}>
                Add friend
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
