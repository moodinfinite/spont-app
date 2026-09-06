import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { respondToFriendRequest } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { accept } = await request.json()
  try {
    const friendship = await respondToFriendRequest(prisma, params.id, userId, accept)
    return NextResponse.json({ friendship })
  } catch (err) {
    return toErrorResponse(err)
  }
}
