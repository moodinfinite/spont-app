import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { WaitingHeadline } from '@/components/waiting-headline'
import { WeekScan } from '@/components/week-scan'
import { weekView, type DayView } from '@/lib/availability'
import { refreshProposalsFor } from '@/lib/propose'
import { feedFor, type FeedProposal } from '@/lib/proposals'
import { ProposalCard } from '@/components/proposal-card'
import { HeadActions } from '@/components/head-actions'

/**
 * The feed: what's waiting on you, then what you've said yes to.
 *
 * Proposals are topped up on load rather than by a scheduled job. That's the
 * honest MVP shape — there's no cron in this deployment, and the generator is
 * bounded by the per-day cap, so calling it on every visit costs a couple of
 * calendar reads and usually creates nothing. Move it to a morning job before
 * this has more users than a friends test.
 *
 * One consequence: the layout works out the dock's dots in parallel with this
 * page, so on the very render that creates a proposal the Home dot hasn't
 * caught up. It's the one render where that doesn't matter — the cards are
 * on the screen you're looking at — and any later navigation is correct. The
 * alternative, generating in the layout, would run calendar reads on every
 * route including the signed-out ones.
 *
 * When there's nothing, the empty states below are the correct screen rather
 * than a placeholder: quiet is the normal state here.
 *
 * Design: docs/superpowers/mockups/2026-09-06-home-feed-mockup-v2-rounded.html
 * and docs/superpowers/mockups/2026-09-07-cold-start-flow.html
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

  // No point looking for overlap with nobody.
  if (friendCount > 0) {
    try {
      await refreshProposalsFor(userId)
    } catch (error) {
      // A calendar that won't answer shouldn't take the feed down with it.
      console.error('Could not look for new proposals', error)
    }
  }

  const { open, upcoming } = await feedFor(userId)
  const hasSomething = open.length > 0 || upcoming.length > 0
  const days = hasSomething ? null : await thisWeek(userId, user.preferredHangoutMinutes)

  return (
    <main className="page">
      <header className="page-head">
        <h1>Welcome {user.name.split(' ')[0]}.</h1>
        <HeadActions initial={user.name.trim().charAt(0).toUpperCase()} />
      </header>

      {open.map((proposal) => (
        <ProposalCard
          key={proposal.id}
          id={proposal.id}
          headline={headlineFor(proposal)}
          reason={reasonFor(proposal)}
          day={dayLabel(proposal.startsAt)}
          time={timeLabel(proposal.startsAt, proposal.endsAt)}
        />
      ))}

      {upcoming.length > 0 && (
        <>
          <div className="section-label">
            <span>Upcoming</span>
            <span>{upcoming.length}</span>
          </div>
          <div className="panel">
            {upcoming.map((proposal) => (
              <div className="row" key={proposal.id}>
                <span className="row-text">
                  <span className="row-name">{withWhom(proposal)}</span>
                  <span className="row-sub">
                    {proposal.view === 'CONFIRMED_FOR_YOU'
                      ? 'It\u2019s on.'
                      : waitingOn(proposal)}
                  </span>
                </span>
                <span className="upcoming-when">
                  {dayLabel(proposal.startsAt)}
                  <br />
                  {timeLabel(proposal.startsAt, proposal.endsAt)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {!hasSomething &&
        (friendCount === 0 ? (
          <NobodyYet days={days} />
        ) : (
          <NothingOpenYet friendCount={friendCount} days={days} />
        ))}

      {open.length > 0 && (
        <p className="note">
          One of these per person at a time. Saying no to one doesn&rsquo;t stop the next.
        </p>
      )}
    </main>
  )
}

/** "You + Edward," / "The Softest Lads," and the day it's on. */
function headlineFor(p: FeedProposal): string {
  return `${withWhom(p)}, ${shortDay(p.startsAt)}.`
}

function withWhom(p: FeedProposal): string {
  if (p.groupName) return p.groupName
  const names = p.others.map((o) => o.name)
  if (names.length === 1) return `You + ${names[0]}`
  if (names.length === 2) return `You + ${names[0]} + ${names[1]}`
  return `You + ${names.length} others`
}

/**
 * Why this one. It says what the matcher actually knows — that the gap is
 * real — rather than the mockup's "you haven't hung out in 19 days", which
 * would need history nothing records yet.
 */
function reasonFor(p: FeedProposal): string {
  if (p.groupName) {
    const n = p.others.length + 1
    return `${n} of you are free at the same time.`
  }
  return 'You\u2019re both free, with room either side.'
}

function waitingOn(p: FeedProposal): string {
  const pending = p.others.filter((o) => o.response === 'PENDING').map((o) => o.name)
  if (pending.length === 0) return 'Waiting on the others.'
  if (pending.length === 1) return `Waiting on ${pending[0]}.`
  return `Waiting on ${pending.length} others.`
}

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
const SHORT_DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long' })
const TIME = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })

function dayLabel(d: Date): string {
  return DAY.format(d)
}

/**
 * "Tonight" beats "Tuesday" when it is Tuesday — a weekday name for
 * something happening in three hours reads as next week.
 */
function shortDay(d: Date, now = new Date()): string {
  const days = daysApart(d, now)
  if (days === 0) return d.getHours() >= 17 ? 'tonight' : 'today'
  if (days === 1) return d.getHours() >= 17 ? 'tomorrow night' : 'tomorrow'
  return SHORT_DAY.format(d)
}

/** Whole days between two moments, by calendar date rather than by hours. */
function daysApart(a: Date, b: Date): number {
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((midnight(a) - midnight(b)) / 86_400_000)
}

/** "6:00–7:00 pm" — one meridiem where both ends share it. */
function timeLabel(start: Date, end: Date): string {
  const from = TIME.format(start)
  const to = TIME.format(end)
  const suffix = to.slice(-2)
  return from.endsWith(suffix) ? `${from.slice(0, -3)}\u2013${to}` : `${from}\u2013${to}`
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
