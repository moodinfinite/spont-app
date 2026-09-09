'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AddMenu } from './add-menu'

/**
 * The floating pill dock: three destinations and a create button.
 *
 * Settings was originally reached only from an avatar in every page header.
 * That avatar was carrying two jobs — "this is you" and "this is the way in"
 * — and only ever announced the first. Now that appearance and your profile
 * both live in Settings, it earns a stop of its own, and the headers are
 * free of controls entirely. A gear, not a person: a single-person icon read
 * as a near-copy of People's two-person one, which is why "You" was dropped
 * from the dock the first time.
 *
 * A tab carries a dot when something behind it needs an answer: an
 * unanswered proposal on Home, a friend request or group invite on People.
 * A dot rather than a count — the number doesn't change what you do, and
 * this is the whole of Spont's notification surface. There is no bell, and
 * nothing pushes.
 */
export function Dock({
  inviteCode,
  homeWaiting = false,
  peopleWaiting = false,
}: {
  inviteCode: string
  /** Something on the feed needs an answer. */
  homeWaiting?: boolean
  /** A friend request or a group invite is sitting on People. */
  peopleWaiting?: boolean
}) {
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
          <span className="dock-label">Home</span>
          {homeWaiting && <span className="dock-dot" aria-label="Waiting on you" />}
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
          <span className="dock-label">People</span>
          {peopleWaiting && <span className="dock-dot" aria-label="Waiting on you" />}
        </Link>
        <Link href="/settings" aria-current={current('/settings')}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M10 2.4h0a1.5 1.5 0 0 1 1.5 1.5v.3c0 .6.35 1.1.9 1.35.55.24 1.18.15 1.6-.28l.2-.2a1.5 1.5 0 0 1 2.13 2.12l-.2.2c-.43.43-.53 1.06-.29 1.61.23.55.78.9 1.38.9h.28a1.5 1.5 0 0 1 0 3h-.3c-.6 0-1.1.35-1.35.9-.24.55-.15 1.18.28 1.6l.2.2a1.5 1.5 0 0 1-2.12 2.13l-.2-.2c-.43-.43-1.06-.53-1.61-.29-.55.23-.9.78-.9 1.38v.28a1.5 1.5 0 0 1-3 0v-.3c0-.6-.38-1.13-.94-1.36-.55-.24-1.18-.15-1.6.28l-.2.2A1.5 1.5 0 0 1 3.63 15.4l.2-.2c.43-.43.53-1.06.29-1.61-.23-.55-.78-.9-1.38-.9h-.28a1.5 1.5 0 0 1 0-3h.3c.6 0 1.1-.38 1.35-.94.24-.55.15-1.18-.28-1.6l-.2-.2A1.5 1.5 0 0 1 5.75 4.83l.2.2c.43.43 1.06.53 1.61.29h.07c.55-.23.9-.78.9-1.38v-.28a1.5 1.5 0 0 1 1.5-1.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="dock-label">Settings</span>
        </Link>
      </nav>
      <AddMenu inviteCode={inviteCode} />
    </div>
  )
}
