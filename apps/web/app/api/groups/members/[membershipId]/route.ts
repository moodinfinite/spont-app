import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { respondToInvite } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function PATCH(request: NextRequest, { params }: { params: { membershipId: string } }) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { accept } = await request.json()
  try {
    const membership = await respondToInvite(prisma, params.membershipId, userId, accept)
    return NextResponse.json({ membership })
  } catch (err) {
    return toErrorResponse(err)
  }
}
