import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { LogoutButton } from '@/components/logout-button'
import { HangoutTimes } from '@/components/hangout-times'
import { PreferencePicker } from '@/components/preference-picker'
import { WindowPicker } from '@/components/window-picker'
import { ThemeChoice } from '@/components/theme-toggle'
import { HeadActions } from '@/components/head-actions'

/**
 * A stop on the dock, alongside Home and People.
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
      <header className="page-head">
        <h1>Settings.</h1>
        <HeadActions initial={user.name.trim().charAt(0).toUpperCase()} linked={false} />
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
            <span className="row-name">Which time wins</span>
            <span className="row-sub">
              When several fit: the next one going, or the one with the most room around
              it — usually a weekend.
            </span>
          </span>
          <WindowPicker value={user.windowPreference} />
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
        {/* "How many a day" lived here. It only ever limited what your own
            visits generated, never what reached you from other people's, so
            the number didn't mean what it said. One open proposal per friend
            is the bound now, and it needs no setting. */}
        <div className="row">
          <span className="row-text">
            <span className="row-name">How far ahead</span>
            <span className="row-sub">Spont won&rsquo;t propose anything past this.</span>
          </span>
          <span className="row-value">30 days</span>
        </div>
      </div>

      {/* Your account, your calendar and how the app looks are all the same
          question — "this is me and this device" — and three one-row panels
          in a stack made them look like three unrelated systems. */}
      <div className="section-label">
        <span>You</span>
      </div>
      <div className="panel">
        <div className="row">
          <span className="avatar" aria-hidden="true">
            {user.name.trim().charAt(0).toUpperCase()}
          </span>
          <span className="row-text">
            <span className="row-name">{user.name}</span>
            <span className="row-sub">{user.email}</span>
          </span>
        </div>

        <div className="row">
          <span className="row-text">
            <span className="row-name">{calendar ? 'Google Calendar' : 'No calendar yet'}</span>
            <span className="row-sub">
              {calendar
                ? 'Free or busy only — never what’s actually on it.'
                : 'Spont can’t find anything until a calendar is connected.'}
            </span>
          </span>
          <span className="row-value">{calendar ? 'Connected' : 'Off'}</span>
        </div>

        <div className="row">
          <span className="row-text">
            <span className="row-name">Light or dark</span>
            <span className="row-sub">Follow your phone, or override it on this device.</span>
          </span>
          <ThemeChoice />
        </div>

        <LogoutButton />
      </div>

      <p className="note">Spont works fine if you never open this screen. That&rsquo;s the goal.</p>
    </main>
  )
}
