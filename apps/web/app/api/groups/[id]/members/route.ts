import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { inviteMember } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { userId: inviteeId } = await request.json()
  try {
    const membership = await inviteMember(prisma, params.id, userId, inviteeId)
    return NextResponse.json({ membership })
  } catch (err) {
    return toErrorResponse(err)
  }
}
