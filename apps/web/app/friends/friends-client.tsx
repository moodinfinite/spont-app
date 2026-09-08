'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

const initial = (name: string) => name.trim().charAt(0).toUpperCase()

type UserSummary = { id: string; name: string; email: string }

export function FriendsClient({
  accepted,
  incoming,
  outgoing,
  directory,
  groups,
  you,
}: {
  accepted: UserSummary[]
  incoming: { id: string; from: UserSummary }[]
  outgoing: { id: string; to: UserSummary }[]
  directory: UserSummary[]
  groups: { id: string; name: string; memberCount: number }[]
  you: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'friends' | 'groups'>('friends')
  const [newGroup, setNewGroup] = useState('')

  async function createGroup() {
    if (!newGroup.trim()) return
    setPending(true)
    setError(null)
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroup }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Something went wrong')
      setPending(false)
      return
    }
    setNewGroup('')
    setPending(false)
    router.refresh()
  }

  async function sendRequest(toUserId: string) {
    setPending(true)
    setError(null)
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId }),
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

  async function respond(friendshipId: string, accept: boolean) {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/friends/${friendshipId}`, {
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
    <main className="page">
      <header className="page-head">
        <h1>People.</h1>
        <div className="head-actions">
          <ThemeToggle />
          <Link href="/settings" className="avatar" aria-label="You">
            {you}
          </Link>
        </div>
      </header>

      <div className="tabs" role="tablist">
        <button
          className="pill"
          role="tab"
          aria-current={tab === 'friends' ? 'page' : undefined}
          onClick={() => setTab('friends')}
        >
          Friends <span className="tab-count">{accepted.length}</span>
        </button>
        <button
          className="pill"
          role="tab"
          aria-current={tab === 'groups' ? 'page' : undefined}
          onClick={() => setTab('groups')}
        >
          Groups <span className="tab-count">{groups.length}</span>
        </button>
      </div>

      {error && (
        <p className="note" style={{ color: 'var(--warn)' }}>
          {error}
        </p>
      )}

      {tab === 'groups' ? (
        <>
          {groups.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '30px 24px' }}>
              <p
                style={{
                  fontFamily: "'Sora', system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: 20,
                  letterSpacing: '-0.015em',
                  margin: '0 0 6px',
                }}
              >
                No groups yet.
              </p>
              <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
                A group is for the people you see together — a crew, not a shortcut for
                messaging several friends at once.
              </p>
            </div>
          ) : (
            <div className="panel">
              {groups.map((g) => (
                <Link className="row" key={g.id} href={`/groups/${g.id}`}>
                  <span className="person-avatar">{initial(g.name)}</span>
                  <span className="row-text">
                    <span className="row-name">{g.name}</span>
                    <span className="row-sub">
                      {g.memberCount} {g.memberCount === 1 ? 'person' : 'people'}
                    </span>
                  </span>
                  <span className="chev" aria-hidden="true">
                    <svg viewBox="0 0 16 16" fill="none">
                      <path
                        d="M6 3l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className="section-label">
            <span>Start a group</span>
          </div>
          <div className="panel">
            <div className="row">
              <input
                className="text-input"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="The Softest Lads"
                aria-label="Group name"
              />
              <button
                className="btn btn-yes"
                style={{ flex: 'none', padding: '10px 16px' }}
                disabled={pending || !newGroup.trim()}
                onClick={createGroup}
              >
                Create
              </button>
            </div>
          </div>

          <p className="note">
            Spont proposes to a group when any two of you are free, not only when everyone is.
          </p>
        </>
      ) : (
        <>

      {incoming.length > 0 && (
        <>
          <div className="section-label">
            <span>Waiting on you</span>
            <span>{incoming.length}</span>
          </div>
          <div className="panel">
            {incoming.map((r) => (
              <div className="row" key={r.id}>
                <span className="person-avatar">{initial(r.from.name)}</span>
                <span className="person-name">{r.from.name}</span>
                <button
                  className="btn btn-yes"
                  style={{ flex: 'none', padding: '10px 16px' }}
                  disabled={pending}
                  onClick={() => respond(r.id, true)}
                >
                  Accept
                </button>
                <button
                  className="btn btn-no"
                  style={{ padding: '10px 14px' }}
                  disabled={pending}
                  onClick={() => respond(r.id, false)}
                >
                  No
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-label">
        <span>Your people</span>
        <span>{accepted.length}</span>
      </div>
      {accepted.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '30px 24px' }}>
          <p
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: 20,
              letterSpacing: '-0.015em',
              margin: '0 0 6px',
            }}
          >
            Nobody yet.
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
            Spont needs at least one other person before it can find anything.
          </p>
        </div>
      ) : (
        <div className="panel">
          {accepted.map((u) => (
            <div className="row" key={u.id}>
              <span className="person-avatar">{initial(u.name)}</span>
              <span className="person-name">{u.name}</span>
            </div>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <>
          <div className="section-label">
            <span>Asked, no answer yet</span>
            <span>{outgoing.length}</span>
          </div>
          <div className="panel">
            {outgoing.map((r) => (
              <div className="row" key={r.id}>
                <span className="person-avatar">{initial(r.to.name)}</span>
                <span className="person-name">{r.to.name}</span>
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
            <span>Also on Spont</span>
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
                  onClick={() => sendRequest(u.id)}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="note">
        Spont only ever suggests times with people you have both agreed to.
      </p>
        </>
      )}
    </main>
  )
}
