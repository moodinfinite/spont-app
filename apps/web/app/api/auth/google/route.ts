import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { authorizeUrl, googleConfig, newState, STATE_COOKIE } from '@/lib/google'

/**
 * Start of sign-up. There's no account to create first — connecting the
 * calendar is the sign-up.
 */
export async function GET() {
  const config = googleConfig()
  if (!config) {
    return NextResponse.redirect(
      new URL('/welcome?error=not_configured', process.env.APP_URL ?? 'http://localhost:3000'),
    )
  }

  // Random value echoed back by Google, so a callback we didn't start gets
  // rejected rather than signing someone in.
  const state = newState()
  cookies().set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  return NextResponse.redirect(authorizeUrl(config, state))
}
