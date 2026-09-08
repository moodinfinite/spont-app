import { NextRequest, NextResponse } from 'next/server'

/**
 * Reachable without a session. The Google routes have to be here or sign-up
 * is impossible — you can't authenticate your way to the thing that
 * authenticates you.
 */
const PUBLIC_PATHS = ['/welcome', '/join', '/api/auth/google']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }
  const session = request.cookies.get('spont_session')
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
        { status: 401 },
      )
    }
    return NextResponse.redirect(new URL('/welcome', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
