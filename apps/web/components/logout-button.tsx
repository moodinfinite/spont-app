'use client'

import { useRouter } from 'next/navigation'

/**
 * Sits as a row inside a Settings panel, so it takes the row's shape rather
 * than looking like a button dropped into a list. Red because it's the one
 * destructive thing on the screen — semantic, not the accent.
 */
export function LogoutButton() {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/welcome')
    router.refresh()
  }

  return (
    <button type="button" className="row-action danger" onClick={logout}>
      <span>Log out</span>
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M12.5 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h6a1.5 1.5 0 0 0 1.5-1.5v-1.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M8 10h9m0 0-2.5-2.5M17 10l-2.5 2.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
