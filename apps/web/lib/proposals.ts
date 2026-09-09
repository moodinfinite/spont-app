import { prisma } from '@spont/db'
import { statusOf, viewFor, type ParticipantView, type Response } from '@spont/core'

/**
 * Reading proposals back out, in the shape the feed draws.
 *
 * The lifecycle rules in packages/core decide what a proposal *is* right now;
 * this only fetches and reshapes. Status is recomputed from the participants
 * on every read rather than trusted from the column, so a proposal that ran
 * out of time is expired the moment you look at it, without a job having run.
 */

export type FeedPerson = { id: string; name: string; response: Response }

export type FeedProposal = {
  id: string
  startsAt: Date
  endsAt: Date
  isGroup: boolean
  groupName: string | null
  others: FeedPerson[]
  view: ParticipantView
  /**
   * Set when a person asked for this rather than the matcher finding it, and
   * that person isn't you. A friend asking carries more weight than an
   * algorithm suggesting, and the card says so.
   */
  askedBy: string | null
}

export type Feed = {
  /** Waiting on your answer. */
  open: FeedProposal[]
  /** You said yes: either it's on, or the others haven't answered. */
  upcoming: FeedProposal[]
}

export async function feedFor(userId: string, now = new Date()): Promise<Feed> {
  const rows = await prisma.proposal.findMany({
    where: {
      participants: { some: { userId } },
      // Once it's started it's history, whatever anyone answered.
      startsAt: { gt: now },
      status: { in: ['OPEN', 'CONFIRMED'] },
    },
    include: {
      participants: { include: { user: true } },
      group: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { startsAt: 'asc' },
  })

  const open: FeedProposal[] = []
  const upcoming: FeedProposal[] = []

  for (const row of rows) {
    const state = {
      startsAt: row.startsAt,
      isGroup: row.groupId !== null,
      participants: row.participants.map((p) => ({
        userId: p.userId,
        response: p.response as Response,
      })),
    }

    const status = statusOf(state, now)
    if (status === 'CANCELLED' || status === 'EXPIRED') continue

    const proposal: FeedProposal = {
      id: row.id,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      isGroup: state.isGroup,
      groupName: row.group?.name ?? null,
      others: row.participants
        .filter((p) => p.userId !== userId)
        .map((p) => ({ id: p.userId, name: p.user.name, response: p.response as Response })),
      view: viewFor(state, userId, now),
      askedBy:
        row.origin === 'INVITED' && row.createdById !== null && row.createdById !== userId
          ? (row.createdBy?.name ?? null)
          : null,
    }

    if (proposal.view === 'AWAITING_YOU') open.push(proposal)
    else if (proposal.view === 'WAITING_ON_OTHERS' || proposal.view === 'CONFIRMED_FOR_YOU') {
      upcoming.push(proposal)
    }
  }

  return { open, upcoming }
}

/**
 * Whether anything is waiting on this person — the dot on the Home tab.
 *
 * Counted rather than fetched in full: the badge only needs to know that the
 * number isn't zero, and this runs on every page in the layout.
 */
export async function hasUnanswered(userId: string, now = new Date()): Promise<boolean> {
  const rows = await prisma.proposal.findMany({
    where: {
      status: 'OPEN',
      startsAt: { gt: now },
      participants: { some: { userId, response: 'PENDING' } },
    },
    include: { participants: true },
  })

  return rows.some((row) => {
    const state = {
      startsAt: row.startsAt,
      isGroup: row.groupId !== null,
      participants: row.participants.map((p) => ({
        userId: p.userId,
        response: p.response as Response,
      })),
    }
    // A proposal the others already killed isn't waiting on you.
    return statusOf(state, now) === 'OPEN'
  })
}

/** Anything on the People screen that needs an answer — friend or group. */
export async function hasPeopleWaiting(userId: string): Promise<boolean> {
  const [friendRequests, groupInvites] = await Promise.all([
    prisma.friendship.count({ where: { userBId: userId, status: 'PENDING' } }),
    prisma.groupMembership.count({ where: { userId, status: 'INVITED' } }),
  ])
  return friendRequests + groupInvites > 0
}
