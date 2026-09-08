import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { WaitingHeadline } from '@/components/waiting-headline'
import { WeekScan } from '@/components/week-scan'
import { weekView, type DayView } from '@/lib/availability'

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
  const days = await thisWeek(userId, user.preferredHangoutMinutes)

  return (
    <main className="page">
      <header className="page-head">
        <h1>Welcome {user.name.split(' ')[0]}.</h1>
      </header>

      {friendCount === 0 ? (
        <NobodyYet days={days} />
      ) : (
        <NothingOpenYet friendCount={friendCount} days={days} />
      )}
    </main>
  )
}

/**
 * Your own week, as drawable bars.
 *
 * Returns null when there's no calendar connected, when Google says no (an
 * expired refresh token is a weekly event in testing mode), or when the week
 * is so empty there's nothing to draw — a blank calendar renders as seven
 * full-width green bars, which is honest but says nothing. In all three cases
 * the empty state falls back to words alone.
 */
async function thisWeek(userId: string, minMinutes: number): Promise<DayView[] | null> {
  const account = await prisma.calendarAccount.findFirst({
    where: { userId },
    select: { id: true, provider: true },
  })
  if (!account) return null

  try {
    const days = await weekView(account, { minMinutes })
    if (!days || !days.some((d) => d.busy.length > 0)) return null
    return days
  } catch (error) {
    console.error('Could not build the week view', error)
    return null
  }
}

/**
 * Nobody connected. Spont can't do anything alone, and saying so plainly
 * beats an empty feed that reads as a broken app.
 */
function NobodyYet({ days }: { days: DayView[] | null }) {
  return (
    <>
      <div className="card-dark" style={{ marginBottom: days ? 10 : 0 }}>
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

      {days && (
        <div className="panel">
          <WeekScan days={days} />
        </div>
      )}

      <p className="note">
        {days
          ? 'This is your week so far. Green is a window worth using.'
          : 'We look every morning. If there’s a window in the next 30 days, it’ll be here.'}
      </p>
    </>
  )
}

/**
 * Friends exist, but no proposal has been made. Quiet is the normal state
 * here, not a failure — the cap is two a day and most days have none.
 */
function NothingOpenYet({ friendCount, days }: { friendCount: number; days: DayView[] | null }) {
  const people = `${friendCount} ${friendCount === 1 ? 'friend' : 'friends'}`

  // With a week to show, the lead shrinks to a caption above it — the bars
  // are the answer, and repeating it in 21px type twice over reads as filler.
  if (days) {
    return (
      <>
        <div className="panel" style={{ marginBottom: 10, padding: '20px 20px 18px' }}>
          <p
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              fontWeight: 400,
              fontSize: 21,
              letterSpacing: '-0.015em',
              margin: '0 0 5px',
            }}
          >
            Still looking.
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
            Nothing lines up with your {people} this week — here&rsquo;s where you&rsquo;re open.
          </p>
        </div>

        <div className="panel">
          <WeekScan days={days} />
        </div>

        <p className="note">We look every morning. Green is a window worth using.</p>
      </>
    )
  }

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
          {people}.
        </p>
      </div>
      <p className="note">Two open slots a day, at most. Usually fewer.</p>
    </>
  )
}
