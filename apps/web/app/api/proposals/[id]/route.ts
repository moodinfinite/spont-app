import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { AppError, respond, statusOf, withdraw, type Response } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

/**
 * Answering a proposal. `accept: true` is yes; `false` covers both "no
 * thanks" and "can't make it any more" — to everyone else those are the same
 * thing, and which one it was is a question of timing, not of record.
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
    const { accept } = await request.json()

    const proposal = await prisma.proposal.findUnique({
      where: { id: params.id },
      include: { participants: true },
    })
    if (!proposal) throw new AppError('NOT_FOUND', 'No such proposal')

    const mine = proposal.participants.find((p) => p.userId === userId)
    if (!mine) throw new AppError('NOT_AUTHORIZED', 'You are not on this proposal')

    const now = new Date()
    if (proposal.startsAt <= now) {
      throw new AppError('INVALID_STATE', 'That one has already started')
    }

    const before = proposal.participants.map((p) => ({
      userId: p.userId,
      response: p.response as Response,
    }))

    // Backing out after a yes is a withdrawal; the rules treat it as a
    // decline that also gives up any calendar hold.
    const after = accept
      ? respond(before, userId, 'ACCEPTED')
      : mine.response === 'ACCEPTED'
        ? withdraw(before, userId)
        : respond(before, userId, 'DECLINED')

    const state = { startsAt: proposal.startsAt, isGroup: proposal.groupId !== null, participants: after }
    const status = statusOf(state, now)

    await prisma.$transaction([
      prisma.proposalParticipant.update({
        where: { id: mine.id },
        data: { response: accept ? 'ACCEPTED' : 'DECLINED', respondedAt: now },
      }),
      prisma.proposal.update({
        where: { id: proposal.id },
        // EXPIRED is a fact about the clock, not a state to write down.
        data: { status: status === 'EXPIRED' ? 'OPEN' : status },
      }),
    ])

    return NextResponse.json({ status })
  } catch (err) {
    return toErrorResponse(err)
  }
}
