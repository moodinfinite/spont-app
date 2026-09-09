import type { PrismaClient, Proposal } from '@spont/db'
import { AppError } from '../errors'

/**
 * Proposals a person asked for, rather than ones the matcher found.
 *
 * The schema has always had room for these — `origin: INVITED` and
 * `createdById` were defined with the model and never written to. Everything
 * in the app until now came from the matcher and was stamped SUGGESTED.
 *
 * The asker is stored as ACCEPTED rather than PENDING. They chose the people
 * and chose the time; asking them to also answer their own question would be
 * a step that could only ever have one answer. It also means the proposal
 * shows up in their Upcoming as "waiting on" the people they asked, which is
 * the true state of it.
 */
export async function createInvitedProposal(
  prisma: PrismaClient,
  input: {
    createdById: string
    withUserIds: string[]
    startsAt: Date
    endsAt: Date
  },
  now: Date = new Date(),
): Promise<Proposal> {
  const { createdById, startsAt, endsAt } = input

  // Duplicates would become two participant rows for one person, which the
  // unique constraint would reject anyway — but with a worse error.
  const withUserIds = [...new Set(input.withUserIds)].filter((id) => id !== createdById)

  if (withUserIds.length === 0) {
    throw new AppError('INVALID_STATE', 'Ask at least one other person')
  }
  if (startsAt <= now) {
    throw new AppError('INVALID_STATE', 'That time has already passed')
  }
  if (endsAt <= startsAt) {
    throw new AppError('INVALID_STATE', 'A hangout has to end after it starts')
  }

  /**
   * You can only ask people who agreed to be asked. Friendship is the whole
   * permission model here — without this check the endpoint would let anyone
   * put a card on any stranger's feed by guessing an id.
   */
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { userAId: createdById, userBId: { in: withUserIds } },
        { userBId: createdById, userAId: { in: withUserIds } },
      ],
    },
    select: { userAId: true, userBId: true },
  })

  const friendIds = new Set(
    friendships.map((f) => (f.userAId === createdById ? f.userBId : f.userAId)),
  )
  if (withUserIds.some((id) => !friendIds.has(id))) {
    throw new AppError('NOT_AUTHORIZED', 'You can only invite people you are friends with')
  }

  return prisma.proposal.create({
    data: {
      origin: 'INVITED',
      status: 'OPEN',
      startsAt,
      endsAt,
      createdById,
      participants: {
        create: [
          { userId: createdById, response: 'ACCEPTED', respondedAt: now },
          ...withUserIds.map((userId) => ({ userId, response: 'PENDING' as const })),
        ],
      },
    },
  })
}
