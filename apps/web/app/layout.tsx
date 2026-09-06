import type { ReactNode } from 'react'
import Link from 'next/link'
import './globals.css'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { LogoutButton } from '@/components/logout-button'

export const metadata = { title: 'Spont' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const userId = getCurrentUserId()
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null

  return (
    <html lang="en">
      <body>
        <header>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/friends">Friends</Link>
            <Link href="/groups">Groups</Link>
            <Link href="/notifications">Notifications</Link>
            <Link href="/settings">Settings</Link>
          </nav>
          {user && (
            <span>
              {user.name} <LogoutButton />
            </span>
          )}
        </header>
        {children}
      </body>
    </html>
  )
}
