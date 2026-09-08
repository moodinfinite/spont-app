import { redirect } from 'next/navigation'
import { prisma } from '@spont/db'
import { getCurrentUserId } from '@/lib/session'
import { AcceptInvite } from './accept-invite'

/**
 * Where an invite link lands.
 *
 * The invite carries a person, not a product pitch — you're here because
 * someone specific wants to see you more, and that's what the page says.
 * Signed out, it's the welcome screen with their name on it; the code rides
 * along in a cookie so the friendship can be made once they've signed up.
 */
export default async function JoinPage({ params }: { params: { code: string } }) {
  const code = params.code

  // The code is the tail of the inviter's id — short enough to paste into a
  // group chat, long enough not to be guessed at this scale.
  const inviter = await prisma.user.findFirst({
    where: { id: { endsWith: code } },
    select: { id: true, name: true },
  })

  if (!inviter) {
    return (
      <main className="welcome">
        <div className="welcome-inner">
          <div className="welcome-body">
            <h1>That link has expired.</h1>
            <p>Ask whoever sent it for a fresh one.</p>
          </div>
        </div>
      </main>
    )
  }

  const userId = getCurrentUserId()
  const me = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null

  if (me && me.id === inviter.id) redirect('/friends')

  if (me) {
    const already = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: me.id, userBId: inviter.id },
          { userAId: inviter.id, userBId: me.id },
        ],
      },
    })

    return (
      <main className="page">
        <header className="page-head">
          <h1>
            {inviter.name}
            <br />
            wants to see you.
          </h1>
        </header>

        {already ? (
          <>
            <div className="panel" style={{ textAlign: 'center', padding: '30px 24px' }}>
              <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0, lineHeight: 1.55 }}>
                You two are already connected. Spont will let you know when your calendars line up.
              </p>
            </div>
            <p className="note">
              <a href="/">Go to your feed</a>
            </p>
          </>
        ) : (
          <AcceptInvite inviterId={inviter.id} inviterName={inviter.name} />
        )}
      </main>
    )
  }

  return (
    <main className="welcome">
      <div className="welcome-inner">
        <div className="welcome-top">
          <div className="brand">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9.5" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="14.5" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span>Spont</span>
          </div>
        </div>

        <div className="welcome-body">
          <h1>{inviter.name} wants to see you more.</h1>
          <p>
            Spont finds when you and your friends are free, turning &ldquo;we should hang out
            sometime&rdquo; into an actual hangout.
          </p>
          <p>Connect your calendar and it&rsquo;ll look for where yours and theirs line up.</p>
        </div>

        <div className="welcome-foot">
          <a className="welcome-cta" href={`/api/auth/google?invite=${encodeURIComponent(code)}`}>
            Connect your calendar
          </a>
          <p className="welcome-fine">
            We only ever see free or busy — never what&rsquo;s actually on your calendar.
          </p>
        </div>
      </div>
    </main>
  )
}
