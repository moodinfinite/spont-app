import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { InviteLink } from '@/components/invite-link'
import { HangoutTimes } from '@/components/hangout-times'

/**
 * Setup, after the calendar is connected: calendar → preferences → invite.
 *
 * Inviting is last because it's the one step that leaves the app. Ending
 * there means the final screen is the thing we most want someone to do, and
 * they reach it already invested rather than being asked to recruit friends
 * before they've seen anything.
 *
 * Deliberately not showing this person's own free windows anywhere here.
 * Spont is about where two calendars overlap; your own gaps aren't the
 * product, and showing them implies a promise the app can't keep alone.
 */
export default async function ConnectedPage({
  searchParams,
}: {
  searchParams: { step?: string }
}) {
  const userId = getCurrentUserId()
  if (!userId) redirect('/welcome')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) redirect('/welcome')

  const step = searchParams.step === 'invite' ? 'invite' : 'times'

  if (step === 'invite') {
    return (
      <main className="page">
        <div className="setup-steps" aria-hidden="true">
          <i className="on" />
          <i className="on" />
        </div>

        <h1 className="connected-head">Now the part that matters.</h1>
        <p className="connected-lede">
          Spont can&rsquo;t find anything until someone else is on it. Send this to the people you
          actually want to see — a group chat works best.
        </p>

        <InviteLink userId={userId} />

        <Link
          href="/"
          className="btn btn-yes setup-next"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
        >
          Go to your feed
        </Link>

        <p className="note">
          We look every morning. If there&rsquo;s a window in the next 30 days, it&rsquo;ll be here.
        </p>
      </main>
    )
  }

  const stored = (user.hangoutTimes ?? {}) as Record<string, 'yes' | 'never'>

  return (
    <main className="page">
      <div className="connected-mark">
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle className="c-left" cx="19" cy="24" r="12" stroke="currentColor" strokeWidth="2" />
          <circle className="c-right" cx="29" cy="24" r="12" stroke="currentColor" strokeWidth="2" />
          <path
            className="tick"
            d="M19.5 24.5l3.2 3.2 6-6.4"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="setup-steps" aria-hidden="true">
        <i className="on" />
        <i />
      </div>

      <h1 className="connected-head">Calendar connected.</h1>
      <p className="connected-lede">
        One question, then you&rsquo;re done. Your calendar already knows when you&rsquo;re{' '}
        <i>free</i> — this is when you&rsquo;d actually want to see someone.
      </p>

      <HangoutTimes initial={stored} onSaved="/connected?step=invite" cta="Next" />

      <p className="note">You can change these later, but you shouldn&rsquo;t need to.</p>
    </main>
  )
}
