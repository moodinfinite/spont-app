import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { InviteLink } from '@/components/invite-link'
import { HangoutTimes } from '@/components/hangout-times'

/**
 * Setup, after the calendar is connected. Follows the cold-start flow from
 * docs/superpowers/mockups/2026-09-07-cold-start-flow.html: acknowledge the
 * connection, get invites moving, then ask about times.
 *
 * Invites come before preferences on purpose — an invite has to travel to
 * someone else and wait for them, so it should start as early as possible.
 * Preferences are instant and can fill the wait.
 *
 * Deliberately not showing this person's own free windows here. Spont is
 * about where two calendars overlap; your own gaps aren't the product, and
 * showing them implies a promise the app can't keep alone.
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

  const step = searchParams.step === 'times' ? 'times' : 'invite'

  if (step === 'times') {
    const stored = (user.hangoutTimes ?? {}) as Record<string, 'yes' | 'never'>

    return (
      <main className="page">
        <div className="setup-steps" aria-hidden="true">
          <i className="on" />
          <i className="on" />
        </div>

        <h1 className="connected-head">What are your preferences for hangout times?</h1>
        <p className="connected-lede">
          Your calendar already knows when you&rsquo;re <i>free</i>. This is when you&rsquo;d
          actually want to see someone.
        </p>

        <HangoutTimes initial={stored} onSaved="/" cta="Done" />

        <p className="note">You can change these later, but you shouldn&rsquo;t need to.</p>
      </main>
    )
  }

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

      <h1 className="connected-head">Calendar connected.</h1>
      <p className="connected-lede">
        Spont can see when you&rsquo;re free. It needs someone else&rsquo;s calendar before it can
        find where you overlap — so this is the part that matters.
      </p>

      <InviteLink userId={userId} />

      <Link
        href="/connected?step=times"
        className="btn btn-yes setup-next"
        style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
      >
        Next
      </Link>

      <p className="note">
        We look every morning. If there&rsquo;s a window in the next 30 days, it&rsquo;ll be here.
      </p>
    </main>
  )
}
