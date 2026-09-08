import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { ThemeToggle } from '@/components/theme-toggle'
import { WaitingHeadline } from '@/components/waiting-headline'

/**
 * The feed. There are no proposals yet — the matcher exists but nothing
 * creates rows — so every real account is genuinely in the cold-start state,
 * and that is what this renders. It isn't a placeholder standing in for the
 * feed; it's the correct screen for an account with nobody connected yet.
 *
 * Design: docs/superpowers/mockups/2026-09-07-cold-start-flow.html
 */
export default async function HomePage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/welcome')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      friendshipsInitiated: { where: { status: 'ACCEPTED' } },
      friendshipsReceived: { where: { status: 'ACCEPTED' } },
    },
  })
  if (!user) redirect('/welcome')

  const friendCount = user.friendshipsInitiated.length + user.friendshipsReceived.length
  const initial = user.name.trim().charAt(0).toUpperCase()

  return (
    <main className="page">
      <header className="page-head">
        <h1>
          Welcome
          <br />
          {user.name.split(' ')[0]}.
        </h1>
        <div className="head-actions">
          <ThemeToggle />
          <Link href="/notifications" className="icon-btn" aria-label="Notifications">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M10 3a5 5 0 00-5 5v2.6c0 .5-.16 1-.46 1.4L3.6 13.6c-.6.8 0 1.9 1 1.9h10.8c1 0 1.6-1.1 1-1.9l-.94-1.6a2.4 2.4 0 01-.46-1.4V8a5 5 0 00-5-5z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path d="M8 17a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </Link>
          <Link href="/settings" className="avatar" aria-label="You">
            {initial}
          </Link>
        </div>
      </header>

      {friendCount === 0 ? <NobodyYet /> : <NothingOpenYet friendCount={friendCount} />}
    </main>
  )
}

/**
 * Nobody connected. Spont can't do anything alone, and saying so plainly
 * beats an empty feed that reads as a broken app.
 */
function NobodyYet() {
  return (
    <>
      <div className="card-dark">
        <WaitingHeadline />
        <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.55 }}>
          Your calendar is in. Spont needs one more person&rsquo;s before it can find where your
          gaps line up.
        </p>
        <Link
          href="/friends"
          className="btn btn-yes"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
        >
          Add your people
        </Link>
      </div>
      <p className="note">
        We look every morning. If there&rsquo;s a window in the next 30 days, it&rsquo;ll be here.
      </p>
    </>
  )
}

/**
 * Friends exist, but no proposal has been made. Quiet is the normal state
 * here, not a failure — the cap is two a day and most days have none.
 */
function NothingOpenYet({ friendCount }: { friendCount: number }) {
  return (
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
          You&rsquo;re set.
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
          Nothing needs you right now. We&rsquo;ll shout when a window opens with one of your{' '}
          {friendCount} {friendCount === 1 ? 'friend' : 'friends'}.
        </p>
      </div>
      <p className="note">Two open slots a day, at most. Usually fewer.</p>
    </>
  )
}
