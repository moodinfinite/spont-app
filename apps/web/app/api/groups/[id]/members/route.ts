import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { inviteMember, leaveGroup } from '@spont/core'
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

/**
 * Taking yourself out of the group. Always the caller — there's no way to
 * remove somebody else here, deliberately: being shown the door by whoever
 * clicked first is a different feature with a different conversation
 * attached to it.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  try {
    await leaveGroup(prisma, params.id, userId)
    return NextResponse.json({ left: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
