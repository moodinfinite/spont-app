import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { LogoutButton } from '@/components/logout-button'
import { HangoutTimes } from '@/components/hangout-times'
import { PreferencePicker } from '@/components/preference-picker'

/**
 * Reached from the avatar in any page header, not from the dock.
 * Design: docs/superpowers/mockups/2026-09-06-settings-mockup.html
 *
 * Everything saves on tap. A settings screen in an app whose goal is that
 * you don't open it shouldn't also ask you to remember to press Save.
 */
export default async function SettingsPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/welcome')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) redirect('/welcome')

  const calendar = await prisma.calendarAccount.findFirst({ where: { userId } })
  const times = (user.hangoutTimes ?? {}) as Record<string, 'yes' | 'never'>

  return (
    <main className="page">
      <header className="page-head settings-head">
        <Link href="/" className="icon-btn back" aria-label="Back to your feed">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M12 4l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1>Settings.</h1>
      </header>

      <div className="section-label">
        <span>How Spont picks</span>
      </div>
      <div className="panel">
        <div className="signal">
          <div className="signal-name">Your hangout times</div>
          <p className="signal-desc">
            Your calendar already knows when you&rsquo;re free. This is when you&rsquo;d actually
            want to see someone.
          </p>
          <HangoutTimes initial={times} cta="Save times" />
        </div>

        <div className="row">
          <span className="row-text">
            <span className="row-name">Hangout length</span>
            <span className="row-sub">
              Where two people differ, the shorter one wins — it&rsquo;s the one both are
              comfortable with.
            </span>
          </span>
          <PreferencePicker
            field="preferredHangoutMinutes"
            value={user.preferredHangoutMinutes}
            options={[60, 90, 120, 180]}
          />
        </div>

        <div className="row">
          <span className="row-text">
            <span className="row-name">Room around your day</span>
            <span className="row-sub">
              Breathing space either side, so nothing lands hard against a meeting.
            </span>
          </span>
          <PreferencePicker
            field="bufferMinutes"
            value={user.bufferMinutes}
            options={[0, 30, 60, 90]}
          />
        </div>
      </div>

      <div className="section-label">
        <span>Proposals</span>
      </div>
      <div className="panel">
        <div className="row">
          <span className="row-text">
            <span className="row-name">How many a day</span>
            <span className="row-sub">
              The cap on what reaches your feed. More isn&rsquo;t better.
            </span>
          </span>
          <PreferencePicker field="proposalsPerDay" value={user.proposalsPerDay} options={[1, 2, 3]} />
        </div>
        <div className="row">
          <span className="row-text">
            <span className="row-name">How far ahead</span>
            <span className="row-sub">Spont won&rsquo;t propose anything past this.</span>
          </span>
          <span className="row-value">30 days</span>
        </div>
      </div>

      <div className="section-label">
        <span>Calendar</span>
      </div>
      <div className="panel">
        <div className="row">
          <span className="row-text">
            <span className="row-name">{calendar ? 'Google Calendar' : 'Not connected'}</span>
            <span className="row-sub">
              {calendar
                ? 'Connected. Free or busy only — never what’s actually on it.'
                : 'Spont can’t find anything until a calendar is connected.'}
            </span>
          </span>
        </div>
      </div>

      <div className="section-label">
        <span>You</span>
      </div>
      <div className="panel">
        <div className="row">
          <span className="row-text">
            <span className="row-name">{user.name}</span>
            <span className="row-sub">{user.email}</span>
          </span>
        </div>
        <LogoutButton />
      </div>

      <p className="note">Spont works fine if you never open this screen. That&rsquo;s the goal.</p>
    </main>
  )
}
