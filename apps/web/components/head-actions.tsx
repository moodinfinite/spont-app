import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'

/**
 * What every page header carries on the right: light or dark, and you.
 *
 * One component rather than the same two elements pasted into three pages,
 * which is how they drifted apart the last time. Settings holds the fuller
 * versions of both — a three-state appearance control and your actual
 * profile — and these are the shortcuts.
 *
 * On Settings itself the avatar is a plain shape, not a link: pointing at
 * the page you're already on is a dead control.
 */
export function HeadActions({ initial, linked = true }: { initial: string; linked?: boolean }) {
  return (
    <div className="head-actions">
      <ThemeToggle />
      {linked ? (
        <Link href="/settings" className="avatar" aria-label="You">
          {initial}
        </Link>
      ) : (
        <span className="avatar" aria-hidden="true">
          {initial}
        </span>
      )}
    </div>
  )
}
