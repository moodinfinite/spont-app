import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@spont/db'
import { exchangeCode, fetchIdentity, googleConfig, STATE_COOKIE } from '@/lib/google'
import { setSessionCookie } from '@/lib/session'

const PROVIDER = 'google'

function back(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/welcome?error=${error}`, request.url))
}

/**
 * Where Google sends people back to. This is the moment an account exists:
 * we find the user by the Google account id, or create one.
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
  if (!state || !expected || state !== expected) return back(request, 'bad_state')

  let identity
  let tokens
  try {
    tokens = await exchangeCode(config, code)
    identity = await fetchIdentity(tokens.accessToken)
  } catch (cause) {
    console.error('Google sign-in failed', cause)
    return back(request, 'google_failed')
  }

  // The Google account id is the stable identity; email can change.
  const existing = await prisma.calendarAccount.findFirst({
    where: { provider: PROVIDER, externalId: identity.sub },
  })

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.userId },
        data: { email: identity.email },
      })
    : ((await prisma.user.findUnique({ where: { email: identity.email } })) ??
      (await prisma.user.create({
        data: { name: identity.name, email: identity.email },
      })))

  await prisma.calendarAccount.upsert({
    where: { userId_provider: { userId: user.id, provider: PROVIDER } },
    create: {
      userId: user.id,
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

  setSessionCookie(user.id)
  return NextResponse.redirect(new URL('/', request.url))
}
