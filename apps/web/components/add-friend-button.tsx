'use client'

import { useCallback, useState } from 'react'
import { Sheet } from './sheet'
import { InviteBody } from './invite-body'

/**
 * Adding a friend, on the page where you go looking for it.
 *
 * The + in the dock can also do this, but the dock is a global control and
 * People is where you arrive already thinking about who's missing. The two
 * open the same sheet on purpose — one act, one shape, wherever you start.
 *
 * `tone` picks the weight: "quiet" for the label beside a list that already
 * has people in it, "loud" for the empty state, where this is the only thing
 * worth doing on the screen.
 */
export function AddFriendButton({
  inviteCode,
  tone = 'quiet',
}: {
  inviteCode: string
  tone?: 'quiet' | 'loud'
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      {tone === 'loud' ? (
        <button
          className="btn btn-yes"
          style={{ display: 'block', width: '100%', marginTop: 18 }}
          onClick={() => setOpen(true)}
        >
          Add a friend
        </button>
      ) : (
        <button className="section-action" onClick={() => setOpen(true)}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add
        </button>
      )}

      <Sheet open={open} onClose={close} label="Add a friend">
        <InviteBody inviteCode={inviteCode} onDone={close} />
      </Sheet>
    </>
  )
}
