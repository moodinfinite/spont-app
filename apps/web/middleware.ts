import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/users']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }
  const session = request.cookies.get('spont_session')
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js).*)'],
}
