import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { AppError, createInvitedProposal } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

/**
 * Asking people to a specific time.
 *
 * The window came from /api/proposals/windows, but it is re-checked here
 * rather than trusted: the body is client input, and calendars move between
 * choosing a time and sending it. `createInvitedProposal` owns the rules —
 * friendship, the time being in the future, and who counts as already in.
 */
export async function POST(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  try {
    const { userIds, startsAt, endsAt } = await request.json()
    if (!Array.isArray(userIds) || userIds.some((id) => typeof id !== 'string')) {
      throw new AppError('INVALID_STATE', 'Pick who you want to see')
    }

    const start = new Date(startsAt)
    const end = new Date(endsAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new AppError('INVALID_STATE', 'That time did not make sense')
    }

    const proposal = await createInvitedProposal(prisma, {
      createdById: userId,
      withUserIds: userIds,
      startsAt: start,
      endsAt: end,
    })

    return NextResponse.json({ id: proposal.id })
  } catch (err) {
    return toErrorResponse(err)
  }
}
