'use client'

import { useCallback, useState } from 'react'
import { Sheet } from './sheet'
import { InviteBody } from './invite-body'

/**
 * Inviting someone who isn't on Spont yet.
 *
 * It says "invite", not "add", because People already has Add buttons and
 * they do something else: those send a request to someone who has an account
 * already. Two controls a thumb apart, both labelled Add, doing different
 * things, was the confusing part — the word now matches the act. This one
 * hands you a link to send.
 *
 * The + in the dock opens the same sheet. The dock is a global control and
 * People is where you arrive already thinking about who's missing, so both
 * exist on purpose — one act, one shape, wherever you start.
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
          Invite a friend
        </button>
      ) : (
        <button className="section-action" onClick={() => setOpen(true)}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Invite
        </button>
      )}

      <Sheet open={open} onClose={close} label="Invite a friend">
        <InviteBody inviteCode={inviteCode} onDone={close} />
      </Sheet>
    </>
  )
}
