import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { getCurrentUserId } from '@/lib/session'

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const body = await request.json()
  const endpoint: string = body.endpoint
  const p256dh: string = body.keys?.p256dh
  const auth: string = body.keys?.auth

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth },
    update: { userId, p256dh, auth },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { endpoint } = await request.json()
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } })

  return NextResponse.json({ ok: true })
}
