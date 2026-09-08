import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/session'
import { googleConfig } from '@/lib/google'

/**
 * The first thing anyone sees. The accent green is the whole ground here and
 * nowhere else in the app — this screen is Spont introducing itself, and it
 * gets to be loud once.
 *
 * Design: docs/superpowers/mockups/2026-09-07-cold-start-flow.html
 */

const MESSAGES: Record<string, string> = {
  not_configured:
    "Google sign-in isn't set up on this machine yet — see docs/setup-google-calendar.md.",
  declined:
    'No problem. Spont needs your calendar to find anything, so nothing happens until you connect it.',
  bad_state: 'That sign-in link had expired. Give it another go.',
  no_code: 'Google sent us back without a code. Try again.',
  google_failed:
    "Google wouldn't finish the handshake. Try again, and check the setup if it keeps happening.",
}

export default function WelcomePage({ searchParams }: { searchParams: { error?: string } }) {
  if (getCurrentUserId()) redirect('/')

  const configured = googleConfig() !== null
  const message = searchParams.error ? MESSAGES[searchParams.error] : null

  return (
    <main className="welcome">
      <div className="welcome-inner">
        <div className="welcome-top">
          <div className="brand">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9.5" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="14.5" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span>Spont</span>
          </div>
        </div>

        <div className="welcome-body">
          <h1>See your friends more.</h1>
          <p>
            Spont finds when you and your friends are free, turning &ldquo;we should hang out
            sometime&rdquo; into an actual hangout.
          </p>
          <p>Our goal is simple: less time on the app, more time with your friends.</p>
        </div>

        <div className="welcome-foot">
          {message && (
            <p className="welcome-message" role="status">
              {message}
            </p>
          )}

          <a className="welcome-cta" href="/api/auth/google" aria-disabled={!configured}>
            Connect your calendar
          </a>

          <p className="welcome-fine">
            We only ever see free or busy — never what&rsquo;s actually on your calendar.
          </p>

          {process.env.NODE_ENV !== 'production' && (
            <p className="welcome-fine">
              <Link href="/login">Dev: sign in as a seeded user</Link>
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
