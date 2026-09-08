'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Sheet } from './sheet'
import { InviteBody } from './invite-body'

/**
 * What the + does.
 *
 * Two items, not three. Creating a group was cut: you do it once and then use
 * it for months, it already lives on the Groups tab where you can see the
 * groups you have, and half of people would read it as "propose something to
 * a group", which is what "a hangout" is for.
 *
 * Design: docs/superpowers/mockups/2026-09-08-add-button-flow.html
 */
export function AddMenu({ inviteCode }: { inviteCode: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'menu' | 'friend'>('menu')

  const close = useCallback(() => {
    setOpen(false)
    // Reset behind the slide out, so the sheet doesn't visibly change its
    // mind on the way down.
    setTimeout(() => setStep('menu'), 300)
  }, [])

  return (
    <>
      <button className="fab" aria-label="New" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>

      <Sheet open={open} onClose={close} label="Add">
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
          <InviteBody inviteCode={inviteCode} onDone={close} />
        )}
      </Sheet>
    </>
  )
}
