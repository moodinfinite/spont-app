'use client'

import { useState } from 'react'

/**
 * The single most valuable thing a new user can do, so it's a copy button
 * rather than a link to a page with a copy button on it. A group chat is the
 * realistic destination.
 */
export function InviteLink({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false)

  // Short and shareable rather than the raw id.
  const code = userId.slice(-6)
  const url =
    typeof window === 'undefined' ? `/join/${code}` : `${window.location.origin}/join/${code}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="invite">
      <p className="invite-label">Send this to the people you actually want to see</p>
      <div className="invite-row">
        <span className="invite-url">{url.replace(/^https?:\/\//, '')}</span>
        <button type="button" className="invite-copy" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="invite-hint">Two or three people is enough to start.</p>
    </div>
  )
}
