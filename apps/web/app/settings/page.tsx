import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { LogoutButton } from '@/components/logout-button'

/**
 * Reached from the avatar in any page header, not from the dock.
 * Design: docs/superpowers/mockups/2026-09-06-settings-mockup.html — the
 * scheduling signals in that mockup arrive with the matcher; what's here is
 * what the app can honestly show today.
 */
export default async function SettingsPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) redirect('/login')

  const calendar = await prisma.calendarAccount.findFirst({ where: { userId } })

  return (
    <main className="page">
      <header className="page-head">
        <h1>Settings.</h1>
      </header>

      <div className="section-label">
        <span>You</span>
      </div>
      <div className="panel">
        <div className="row">
          <span style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: 14 }}>{user.name}</strong>
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{user.email}</span>
          </span>
        </div>
      </div>

      <div className="section-label">
        <span>Calendar</span>
      </div>
      <div className="panel">
        <div className="row">
          <span style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: 14 }}>
              {calendar ? 'Connected' : 'Not connected'}
            </strong>
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>
              {calendar
                ? 'Free or busy only — never what’s actually on your calendar.'
                : 'Spont can’t find anything until a calendar is connected.'}
            </span>
          </span>
        </div>
      </div>

      <div className="section-label">
        <span>How Spont picks</span>
      </div>
      <div className="panel">
        <div className="row">
          <span style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: 14 }}>Hangout length</strong>
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
              Where two people differ, the shorter one wins.
            </span>
          </span>
          <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>
            {user.preferredHangoutMinutes} min
          </span>
        </div>
        <div className="row">
          <span style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: 14 }}>Room around your day</strong>
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
              Breathing space either side of what&rsquo;s booked.
            </span>
          </span>
          <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>
            {user.bufferMinutes} min
          </span>
        </div>
      </div>

      <div className="section-label">
        <span>Account</span>
      </div>
      <div className="panel">
        <div className="row">
          <LogoutButton />
        </div>
      </div>

      <p className="note">
        Spont works fine if you never open this screen. That&rsquo;s the goal.
      </p>

      <p className="note">
        <Link href="/">Back to your feed</Link>
      </p>
    </main>
  )
}
