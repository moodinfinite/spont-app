import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'

/**
 * The create flow — step one only.
 *
 * Design: docs/superpowers/mockups/2026-09-06-create-flow-mockup.html. Picking
 * a person is real; asking Spont to find a time isn't wired yet, because
 * nothing writes Proposal rows so far. Rather than fake a send button, this
 * says where it stops.
 */
export default async function NewHangoutPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: { userA: true, userB: true },
  })

  const friends = friendships.map((f) => (f.userAId === userId ? f.userB : f.userA))

  return (
    <main className="page">
      <header className="page-head">
        <h1>
          Who do you
          <br />
          want to see?
        </h1>
      </header>

      {friends.length === 0 ? (
        <>
          <div className="panel" style={{ textAlign: 'center', padding: '34px 24px' }}>
            <p
              style={{
                fontFamily: "'Sora', system-ui, sans-serif",
                fontWeight: 400,
                fontSize: 21,
                letterSpacing: '-0.015em',
                margin: '0 0 6px',
              }}
            >
              Nobody yet.
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
              Spont can&rsquo;t propose anything until someone else is on it.
            </p>
          </div>
          <p className="note">
            <Link href="/friends">Add your people</Link>
          </p>
        </>
      ) : (
        <>
          <div className="panel">
            {friends.map((friend) => (
              <div className="row" key={friend.id}>
                <span className="avatar" style={{ background: 'var(--chip)', color: 'var(--ink)' }}>
                  {friend.name.trim().charAt(0).toUpperCase()}
                </span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>{friend.name}</span>
              </div>
            ))}
          </div>
          <p className="note">
            Picking a time comes next — the matcher can find windows, but nothing saves a proposal
            yet.
          </p>
        </>
      )}
    </main>
  )
}
