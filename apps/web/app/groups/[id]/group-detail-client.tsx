'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

const initial = (name: string) => name.trim().charAt(0).toUpperCase()

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

  // A declined invite is nobody's business but the person who declined —
  // showing it turns a quiet no into a public one.
  const inside = members.filter((m) => m.status === 'ACCEPTED')
  const asked = members.filter((m) => m.status === 'INVITED')

  return (
    <main className="page">
      <header className="page-head head-back">
        <Link href="/friends" className="icon-btn back" aria-label="Back to your people">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M12 4l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1>{groupName}.</h1>
      </header>

      {error && (
        <p className="note" style={{ color: 'var(--warn)' }}>
          {error}
        </p>
      )}

      <div className="section-label">
        <span>In the group</span>
        <span>{inside.length}</span>
      </div>
      <div className="panel">
        {inside.map((m) => (
          <div className="row" key={m.membershipId}>
            <span className="person-avatar">{initial(m.user.name)}</span>
            <span className="row-text">
              <span className="row-name">{m.user.name}</span>
              {m.role === 'OWNER' && <span className="row-sub">Started the group</span>}
            </span>
          </div>
        ))}
      </div>

      {asked.length > 0 && (
        <>
          <div className="section-label">
            <span>Asked, no answer yet</span>
            <span>{asked.length}</span>
          </div>
          <div className="panel">
            {asked.map((m) => (
              <div className="row" key={m.membershipId}>
                <span className="person-avatar">{initial(m.user.name)}</span>
                <span className="person-name">{m.user.name}</span>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>
                  Waiting
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {directory.length > 0 && (
        <>
          <div className="section-label">
            <span>Add someone</span>
          </div>
          <div className="panel">
            {directory.map((u) => (
              <div className="row" key={u.id}>
                <span className="person-avatar">{initial(u.name)}</span>
                <span className="person-name">{u.name}</span>
                <button
                  className="btn btn-no"
                  style={{ padding: '10px 16px' }}
                  disabled={pending}
                  onClick={() => invite(u.id)}
                >
                  Invite
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="note">
        Spont proposes to this group as soon as any two of you are free — it doesn&rsquo;t wait for
        everyone.
      </p>
    </main>
  )
}
