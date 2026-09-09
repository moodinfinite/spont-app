import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { AppError, deleteGroup } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

/**
 * Changing how a group works. Only how many of you have to be free, for now.
 *
 * Any accepted member can set it, matching invites — a group isn't a thing
 * its owner administers, it's a thing you're all in.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  try {
    const membership = await prisma.groupMembership.findFirst({
      where: { groupId: params.id, userId, status: 'ACCEPTED' },
    })
    if (!membership) throw new AppError('NOT_AUTHORIZED', 'You are not in this group')

    const { minAttendees } = await request.json()
    if (!Number.isInteger(minAttendees) || minAttendees < 2) {
      throw new AppError('INVALID_STATE', 'A hangout needs at least two people')
    }

    const accepted = await prisma.groupMembership.count({
      where: { groupId: params.id, status: 'ACCEPTED' },
    })
    if (minAttendees > accepted) {
      throw new AppError('INVALID_STATE', 'That is more people than the group has')
    }

    const group = await prisma.group.update({
      where: { id: params.id },
      data: { minAttendees },
    })
    return NextResponse.json({ minAttendees: group.minAttendees })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * Deleting the group. Owner only — see `deleteGroup` for why this one isn't
 * shared with the rest of the group the way the quorum is.
 *
 * Authorization lives in core rather than being repeated here: a check that
 * decides whether four people lose a group shouldn't have a second copy that
 * can drift from the first.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  try {
    await deleteGroup(prisma, params.id, userId)
    return NextResponse.json({ deleted: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
