import type { ReactNode } from 'react'
import './globals.css'
import { getCurrentUserId } from '@/lib/session'
import { Dock } from '@/components/dock'
import { ThemeScript } from '@/components/theme-toggle'

export const metadata = { title: 'Spont' }

/**
 * Chrome is deliberately thin: no top nav bar. Navigation is the floating
 * dock, and identity lives in each page's own header, where the avatar is
 * the way into Settings. See docs/knowledge-base/design-principles.md.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  const signedIn = Boolean(getCurrentUserId())

  return (
    <html lang="en">
      <head>
        <ThemeScript />
      </head>
      <body>
        {children}
        {signedIn && <Dock />}
      </body>
    </html>
  )
}
