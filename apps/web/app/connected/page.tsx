import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { findOpenings } from '@/lib/google-calendar'
import { InviteLink } from '@/components/invite-link'

/**
 * The moment after connecting a calendar.
 *
 * Someone has just clicked through an "unverified app" warning and handed
 * over calendar access. Dropping them straight onto an empty feed says
 * nothing about whether that worked. This closes the loop, and does it with
 * their own data: real windows read from their real calendar, before a single
 * friend exists.
 */
export default async function ConnectedPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/welcome')

  const account = await prisma.calendarAccount.findFirst({
    where: { userId, provider: 'google' },
  })
  if (!account) redirect('/')

  const openings = await findOpenings(account.id, { days: 30, limit: 4 })

  const fmtDay = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const fmtTime = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })

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

      {openings === null ? (
        <p className="connected-lede">
          We couldn&rsquo;t read your calendar just now — it&rsquo;s connected, so this usually
          sorts itself out. Nothing else to do here.
        </p>
      ) : openings.length === 0 ? (
        <p className="connected-lede">
          You look busy for the next month. Spont will keep watching — the moment something opens
          up alongside a friend, it&rsquo;ll be waiting for you.
        </p>
      ) : (
        <>
          <p className="connected-lede">
            We found {openings.length === 1 ? 'a window' : `${openings.length} windows`} where
            you&rsquo;re free over the next month. Now let&rsquo;s find out who else is.
          </p>

          <div className="panel">
            {openings.map((o) => (
              <div className="row" key={o.start.toISOString()}>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{fmtDay.format(o.start)}</span>
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--ink-2)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtTime.format(o.start)} – {fmtTime.format(o.end)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="connected-invite">
        <InviteLink userId={userId} />
      </div>

      <p className="note">
        We look every morning. If there&rsquo;s a window in the next 30 days, it&rsquo;ll be here.
      </p>

      <p className="note">
        <Link href="/">Go to your feed</Link>
      </p>
    </main>
  )
}
