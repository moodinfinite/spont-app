import type { ReactNode } from 'react'
import './globals.css'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { Dock } from '@/components/dock'
import { ThemeScript } from '@/components/theme-toggle'
import { hasPeopleWaiting, hasUnanswered } from '@/lib/proposals'

export const metadata = { title: 'Spont' }

/**
 * Chrome is deliberately thin: no top nav bar. Navigation is the floating
 * dock — Home, People, Settings — and page headers carry nothing but their
 * own title. See docs/knowledge-base/design-principles.md.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const userId = getCurrentUserId()

  /**
   * A signed cookie only proves the session was issued by us, not that the
   * person it names still exists — a seeded database that gets rebuilt leaves
   * cookies pointing at ids that are gone. Trusting the cookie alone put the
   * dock on the welcome screen, offering Home and Settings to someone the app
   * was about to send back to sign-in.
   */
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    : null

  /**
   * The dots the dock carries. Two counts on every page load, and only for a
   * signed-in person — cheap enough to be worth not having a bell.
   */
  const [homeWaiting, peopleWaiting] = user
    ? await Promise.all([hasUnanswered(user.id), hasPeopleWaiting(user.id)])
    : [false, false]

  return (
    <html lang="en">
      <head>
        <ThemeScript />
      </head>
      <body>
        {children}
        {/* The same short code the People page shares — the tail of the id,
            not the whole thing. */}
        {user && (
          <Dock
            inviteCode={user.id.slice(-6)}
            homeWaiting={homeWaiting}
            peopleWaiting={peopleWaiting}
          />
        )}
      </body>
    </html>
  )
}
