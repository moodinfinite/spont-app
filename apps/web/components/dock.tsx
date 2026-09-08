'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * The floating pill dock. Two destinations and a create button — "You" was
 * dropped because it duplicated the header avatar and its single-person icon
 * read as a near-copy of People's two-person one.
 */
export function Dock() {
  const pathname = usePathname()
  const current = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'page' : undefined

  return (
    <div className="dock-wrap">
      <nav className="dock" aria-label="Primary">
        <Link href="/" aria-current={current('/')}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M3 9.2 10 3.6l7 5.6V16.5H12v-5H8v5H3z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          <span>Home</span>
        </Link>
        <Link href="/friends" aria-current={current('/friends')}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8" cy="7.2" r="3.1" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M2.6 16.6c0-3 2.4-4.7 5.4-4.7s5.4 1.7 5.4 4.7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M14.2 5.1a3.1 3.1 0 0 1 0 5.4M15.6 12.6c1.4.7 2.2 2 2.2 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span>People</span>
        </Link>
      </nav>
      <Link href="/new" className="fab" aria-label="New hangout">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </Link>
    </div>
  )
}
