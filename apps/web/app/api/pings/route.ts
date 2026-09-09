import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { sendAvailabilityPing } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'
import { WebPushSender } from '@/lib/push-sender'

const pushSender = new WebPushSender()

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { groupId, message, windowEnd } = await request.json()
  try {
    const ping = await sendAvailabilityPing(
      prisma,
      pushSender,
      userId,
      groupId,
      message || undefined,
      windowEnd ? new Date(windowEnd) : undefined,
    )
    return NextResponse.json({ ping })
  } catch (err) {
    return toErrorResponse(err)
  }
}
