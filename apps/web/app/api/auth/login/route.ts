import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { setSessionCookie } from '@/lib/session'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 })
  }
  const { userId } = await request.json()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'No such user' } }, { status: 404 })
  }
  setSessionCookie(user.id)
  return NextResponse.json({ user })
}
