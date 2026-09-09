'use client'

import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AddFriendButton } from '@/components/add-friend-button'
import { HeadActions } from '@/components/head-actions'

const initial = (name: string) => name.trim().charAt(0).toUpperCase()

type UserSummary = { id: string; name: string; email: string }

/** Where the accepted row is, and where it's headed — all in page coords. */
type Flight = { left: number; from: number; to: number; width: number; height: number; index: number }

export function FriendsClient({
  accepted,
  incoming,
  outgoing,
  groups,
  groupInvites,
  you,
  inviteCode,
}: {
  accepted: UserSummary[]
  incoming: { id: string; from: UserSummary }[]
  outgoing: { id: string; to: UserSummary }[]
  groups: { id: string; name: string; memberCount: number }[]
  groupInvites: { id: string; name: string }[]
  you: string
  inviteCode: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'friends' | 'groups'>('friends')
  const [newGroup, setNewGroup] = useState('')

  /**
   * Accepting someone, as a moment rather than a page refresh.
   *
   * The row says so where you tapped it, then carries the name down into
   * Your people so you can see where they went. Chosen from the four studies
   * in docs/superpowers/mockups/2026-09-08-accept-friend-motion.html: D's
   * in-place confirmation, A's travel, and no undo — nobody accepts a friend
   * by accident, and an undo would imply the other person had already been
   * told something we'd have to take back.
   *
   * The server refresh that really moves them is held until it lands, so the
   * list doesn't reshuffle underneath the animation.
   */
  const [landing, setLanding] = useState<{ id: string; name: string } | null>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [flying, setFlying] = useState(false)
  const [settled, setSettled] = useState(false)
  const [waitHeight, setWaitHeight] = useState<number | null>(null)

  const pageRef = useRef<HTMLElement>(null)
  const waitRef = useRef<HTMLDivElement>(null)
  const yoursRef = useRef<HTMLDivElement>(null)
  const landingRef = useRef<HTMLDivElement>(null)

  function endLanding() {
    setLanding(null)
    setFlight(null)
    setFlying(false)
    setSettled(false)
    setWaitHeight(null)
    router.refresh()
  }

  // Pin the section's height while it's still open, so it has something to
  // collapse from — a height of auto doesn't animate to zero.
  useLayoutEffect(() => {
    if (landing && waitHeight === null && waitRef.current) {
      setWaitHeight(waitRef.current.offsetHeight)
    }
  }, [landing, waitHeight])

  // Beat one: the green row sits there long enough to be read. Then measure
  // where it is and where it's going, and take it out of the flow.
  useEffect(() => {
    if (!landing || flight) return

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const t = setTimeout(endLanding, 700)
      return () => clearTimeout(t)
    }

    const t = setTimeout(() => {
      const page = pageRef.current
      const row = landingRef.current
      const yours = yoursRef.current
      const wait = waitRef.current
      if (!page || !row || !yours || !wait) return endLanding()

      const p = page.getBoundingClientRect()
      const r = row.getBoundingClientRect()
      const y = yours.getBoundingClientRect()

      // Everything below moves up by whatever collapses behind the row: the
      // whole section if this was the last request, otherwise just its slot.
      const shrink = incoming.length === 1 ? wait.offsetHeight : r.height

      /**
       * Aim at the slot they'll actually occupy. Your people is sorted by
       * name, so flying every new friend to the top of it would put them
       * somewhere they aren't a moment later — the refresh would jump them
       * down the list and undo the one thing the movement was for.
       */
      const index = accepted.filter((u) => u.name.localeCompare(landing.name) < 0).length
      const rowHeight = yours.querySelector('.row')?.getBoundingClientRect().height ?? r.height

      setFlight({
        left: r.left - p.left,
        from: r.top - p.top,
        to: y.top - p.top - shrink + index * rowHeight,
        width: r.width,
        height: r.height,
        index,
      })
    }, 620)
    return () => clearTimeout(t)
  }, [landing, flight, incoming.length, accepted])

  // Beat two: one tick at the starting position so the browser has something
  // to animate from, then the move itself.
  useEffect(() => {
    if (!flight) return
    const go = setTimeout(() => setFlying(true), 20)
    // Beat three: once it's there, the green drains out of it and the name
    // loses the word "Added". It becomes one of your people in front of you,
    // rather than being swapped for one by a refresh.
    const land = setTimeout(() => setSettled(true), 520)
    const done = setTimeout(endLanding, 900)
    return () => {
      clearTimeout(go)
      clearTimeout(land)
      clearTimeout(done)
    }
  }, [flight])

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

  async function respond(friendshipId: string, accept: boolean, name?: string) {
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
    // A yes is worth watching land; a no should just be gone.
    if (accept && name) setLanding({ id: friendshipId, name })
    else router.refresh()
  }

  return (
    <main className="page" ref={pageRef}>
      <header className="page-head">
        <h1>People.</h1>
        <HeadActions initial={you} />
      </header>

      <div className="tabs" role="tablist">
        <button
          className="pill"
          role="tab"
          aria-current={tab === 'friends' ? 'page' : undefined}
          onClick={() => setTab('friends')}
        >
          Friends <span className="tab-count">{accepted.length}</span>
          {incoming.length > 0 && <span className="tab-dot" aria-label="Waiting on you" />}
        </button>
        <button
          className="pill"
          role="tab"
          aria-current={tab === 'groups' ? 'page' : undefined}
          onClick={() => setTab('groups')}
        >
          Groups <span className="tab-count">{groups.length}</span>
          {groupInvites.length > 0 && <span className="tab-dot" aria-label="Waiting on you" />}
        </button>
      </div>

      {error && (
        <p className="note" style={{ color: 'var(--warn)' }}>
          {error}
        </p>
      )}

      {tab === 'groups' ? (
        <>
          {groupInvites.length > 0 && (
            <>
              <div className="section-label">
                <span>Waiting on you</span>
                <span>{groupInvites.length}</span>
              </div>
              <div className="panel">
                {groupInvites.map((g) => (
                  <Link className="row" key={g.id} href={`/groups/${g.id}`}>
                    <span className="person-avatar">{initial(g.name)}</span>
                    <span className="row-text">
                      <span className="row-name">{g.name}</span>
                      <span className="row-sub">You&rsquo;ve been asked to join</span>
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

              <div className="section-label">
                <span>Your groups</span>
                <span>{groups.length}</span>
              </div>
            </>
          )}

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
        <div
          className="wait-collapse"
          ref={waitRef}
          style={
            waitHeight === null
              ? undefined
              : { height: flight && incoming.length === 1 ? 0 : waitHeight, opacity: flight && incoming.length === 1 ? 0 : 1 }
          }
        >
          <div className="section-label">
            <span>Waiting on you</span>
            <span>{incoming.length}</span>
          </div>
          <div className="panel">
            {incoming.map((r) =>
              landing?.id === r.id ? (
                <div
                  className={`row row-added${flight ? ' in-flight' : ''}${settled ? ' landed' : ''}`}
                  key={r.id}
                  ref={landingRef}
                  style={
                    flight
                      ? {
                          position: 'absolute',
                          left: flight.left,
                          top: flying ? flight.to : flight.from,
                          width: flight.width,
                          height: flight.height,
                        }
                      : undefined
                  }
                >
                  <span className="person-avatar">{initial(r.from.name)}</span>
                  <span className="person-name">{settled ? r.from.name : `Added ${r.from.name}`}</span>
                </div>
              ) : (
                <div className="row" key={r.id}>
                  <span className="person-avatar">{initial(r.from.name)}</span>
                  <span className="person-name">{r.from.name}</span>
                  <button
                    className="btn btn-yes"
                    style={{ flex: 'none', padding: '10px 16px' }}
                    disabled={pending || landing !== null}
                    onClick={() => respond(r.id, true, r.from.name)}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-no"
                    style={{ padding: '10px 14px' }}
                    disabled={pending || landing !== null}
                    onClick={() => respond(r.id, false)}
                  >
                    No
                  </button>
                </div>
              ),
            )}
            {/* Once the row lifts off it stops holding its place, so a slot
                closes behind it — unless the whole section is going anyway. */}
            {flight && incoming.length > 1 && (
              <div className="landing-gap" style={{ height: flying ? 0 : flight.height }} />
            )}
          </div>
        </div>
      )}

      <div className="section-label">
        <span>Your people</span>
        {/* The tab pill already carries the count, so this slot is free for
            the thing you came here to do. */}
        <AddFriendButton inviteCode={inviteCode} />
      </div>
      {accepted.length === 0 ? (
        <div
          className="panel"
          ref={yoursRef}
          style={{ textAlign: 'center', padding: '30px 24px' }}
        >
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
          <AddFriendButton inviteCode={inviteCode} tone="loud" />
        </div>
      ) : (
        <div className="panel" ref={yoursRef}>
          {accepted.map((u, i) => (
            <Fragment key={u.id}>
              {flight?.index === i && (
                <div className="landing-gap" style={{ height: flying ? flight.height : 0 }} />
              )}
              <div className="row">
                <span className="person-avatar">{initial(u.name)}</span>
                <span className="person-name">{u.name}</span>
              </div>
            </Fragment>
          ))}
          {flight?.index === accepted.length && (
            <div className="landing-gap" style={{ height: flying ? flight.height : 0 }} />
          )}
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

      <p className="note">
        Spont only ever suggests times with people you have both agreed to.
      </p>
        </>
      )}
    </main>
  )
}
