import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { prisma } from '@spont/db'
import {
  exchangeCode,
  fetchIdentity,
  googleConfig,
  STATE_COOKIE,
  UnverifiedEmailError,
} from '@/lib/google'
import { setSessionCookie } from '@/lib/session'

const PROVIDER = 'google'

function back(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/welcome?error=${error}`, request.url))
}

/** Constant time, so a near-miss doesn't leak how near it was. */
function matches(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Where Google sends people back to. This is the moment an account exists.
 *
 * Identity is keyed on Google's `sub` and nothing else. An earlier version
 * fell back to matching on email and adopting that user, which is the classic
 * pre-account-takeover shape: anyone who could get a row created for an
 * address — the invite flow will do exactly that — would have handed the
 * account to whoever signed in with it first. Linking an existing Spont
 * account to a Google one needs a deliberate, signed-in merge step, not a
 * silent match here.
 */
export async function GET(request: NextRequest) {
  const config = googleConfig()
  if (!config) return back(request, 'not_configured')

  const params = request.nextUrl.searchParams

  // Someone declining consent is not an error worth shouting about.
  if (params.get('error')) return back(request, 'declined')

  const code = params.get('code')
  const state = params.get('state')
  const expected = cookies().get(STATE_COOKIE)?.value
  cookies().delete(STATE_COOKIE)

  if (!code) return back(request, 'no_code')
  if (!state || !expected || !matches(state, expected)) return back(request, 'bad_state')

  let identity
  let tokens
  try {
    tokens = await exchangeCode(config, code)
    identity = await fetchIdentity(tokens.accessToken)
  } catch (cause) {
    if (cause instanceof UnverifiedEmailError) return back(request, 'unverified_email')
    console.error('Google sign-in failed', cause)
    return back(request, 'google_failed')
  }

  const existing = await prisma.calendarAccount.findFirst({
    where: { provider: PROVIDER, externalId: identity.sub },
  })

  let userId: string

  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.userId },
      data: { email: identity.email, name: identity.name },
    })
    userId = user.id
  } else {
    // A Spont account already using this address, but never linked to this
    // Google account. Refuse rather than adopt it.
    const clash = await prisma.user.findUnique({ where: { email: identity.email } })
    if (clash) return back(request, 'email_in_use')

    const user = await prisma.user.create({
      data: { name: identity.name, email: identity.email },
    })
    userId = user.id
  }

  await prisma.calendarAccount.upsert({
    where: { userId_provider: { userId, provider: PROVIDER } },
    create: {
      userId,
      provider: PROVIDER,
      externalId: identity.sub,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
    },
    update: {
      externalId: identity.sub,
      accessToken: tokens.accessToken,
      // Google only sends a refresh token on first consent — keep the one we
      // have rather than overwriting it with null on a re-connect.
      ...(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
      tokenExpiresAt: tokens.expiresAt,
    },
  })

  setSessionCookie(userId)
  return NextResponse.redirect(new URL('/', request.url))
}
