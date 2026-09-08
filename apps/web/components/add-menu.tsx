'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * What the + does.
 *
 * Two items, not three. Creating a group was cut: you do it once and then use
 * it for months, it already lives on the Groups tab where you can see the
 * groups you have, and half of people would read it as "propose something to
 * a group", which is what "a hangout" is for.
 */
export function AddMenu({ inviteCode }: { inviteCode: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'menu' | 'friend'>('menu')
  const [copied, setCopied] = useState(false)

  const path = `/join/${inviteCode}`
  const [url, setUrl] = useState(path)
  useEffect(() => {
    setUrl(`${window.location.origin}${path}`)
  }, [path])

  // Escape closes it, like every other sheet people have used.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function close() {
    setOpen(false)
    setTimeout(() => setStep('menu'), 300)
  }

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
      <button className="fab" aria-label="New" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>

      <div className={`sheet-scrim${open ? ' on' : ''}`} onClick={close} aria-hidden="true" />

      <div
        className={`sheet${open ? ' on' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Add"
        aria-hidden={!open}
      >
        <div className="grabber" />

        {step === 'menu' ? (
          <>
            <h3>What are you adding?</h3>
            <p className="sheet-lede">Two things live behind this button.</p>

            <button
              className="action primary"
              onClick={() => {
                close()
                router.push('/new')
              }}
            >
              <span className="ico">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="txt">
                <span className="t">A hangout</span>
                <span className="d">Pick who — we&rsquo;ll find the time</span>
              </span>
            </button>

            <button className="action" onClick={() => setStep('friend')}>
              <span className="ico">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="8" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M2.4 17c0-3.2 2.5-5 5.6-5 1.2 0 2.3.3 3.2.8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path d="M15 11.5v5M12.5 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <span className="txt">
                <span className="t">A friend</span>
                <span className="d">Send someone your invite link</span>
              </span>
            </button>
          </>
        ) : (
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
              onClick={close}
            >
              Done
            </button>
          </>
        )}
      </div>
    </>
  )
}
