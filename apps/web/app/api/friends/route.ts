import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { sendFriendRequest } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { toUserId } = await request.json()
  try {
    const friendship = await sendFriendRequest(prisma, userId, toUserId)
    return NextResponse.json({ friendship })
  } catch (err) {
    return toErrorResponse(err)
  }
}
