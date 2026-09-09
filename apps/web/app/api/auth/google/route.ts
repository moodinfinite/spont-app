import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { authorizeUrl, googleConfig, INVITE_COOKIE, newState, STATE_COOKIE } from '@/lib/google'

/**
 * Start of sign-up. There's no account to create first — connecting the
 * calendar is the sign-up.
 */
export async function GET(request: NextRequest) {
  const config = googleConfig()
  if (!config) {
    return NextResponse.redirect(
      new URL('/welcome?error=not_configured', process.env.APP_URL ?? 'http://localhost:3000'),
    )
  }

  // An invite has to survive the round trip to Google, so it rides in a
  // cookie rather than being lost the moment we leave the page.
  const invite = request.nextUrl.searchParams.get('invite')
  if (invite) {
    cookies().set(INVITE_COOKIE, invite, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 900,
    })
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
