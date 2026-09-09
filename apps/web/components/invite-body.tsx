'use client'

import { useEffect, useState } from 'react'

/**
 * The invite link, as sheet contents. Shared by the + menu and the People
 * page — the same act in two places, so it should read identically in both.
 */
export function InviteBody({ inviteCode, onDone }: { inviteCode: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false)

  // Short and shareable rather than the raw id.
  const path = `/join/${inviteCode}`

  /**
   * The origin only exists in the browser. Rendering it directly gives the
   * server one string and the client another, which React rejects as a
   * hydration mismatch — so start with the path both agree on and fill in the
   * host after mount.
   */
  const [url, setUrl] = useState(path)
  useEffect(() => {
    setUrl(`${window.location.origin}${path}`)
  }, [path])

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
    <>
      <h3>Send this to someone.</h3>
      <p className="sheet-lede">
        A group chat works best. Spont can&rsquo;t find anything until someone else is on it.
      </p>

      <div className="sheet-invite">
        <span className="sheet-invite-url">{url.replace(/^https?:\/\//, '')}</span>
        <button type="button" className="sheet-invite-copy" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <button
        className="btn btn-yes"
        style={{ display: 'block', width: '100%', marginTop: 14 }}
        onClick={onDone}
      >
        Done
      </button>
    </>
  )
}
