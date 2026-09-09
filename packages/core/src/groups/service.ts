import type { PrismaClient, Group, GroupMembership } from '@spont/db'
import { AppError } from '../errors'

export async function createGroup(prisma: PrismaClient, ownerId: string, name: string): Promise<Group> {
  return prisma.group.create({
    data: {
      name,
      ownerId,
      members: {
        create: { userId: ownerId, status: 'ACCEPTED', role: 'OWNER' },
      },
    },
  })
}

async function requireAcceptedMembership(
  prisma: PrismaClient,
  groupId: string,
  userId: string,
): Promise<GroupMembership> {
  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  })
  if (!membership || membership.status !== 'ACCEPTED') {
    throw new AppError('NOT_AUTHORIZED', 'You are not a member of this group')
  }
  return membership
}

export async function inviteMember(
  prisma: PrismaClient,
  groupId: string,
  inviterUserId: string,
  inviteeUserId: string,
): Promise<GroupMembership> {
  await requireAcceptedMembership(prisma, groupId, inviterUserId)

  const existing = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId: inviteeUserId } },
  })
  if (existing) {
    throw new AppError('ALREADY_MEMBER', 'This person is already invited or a member')
  }

  return prisma.groupMembership.create({
    data: { groupId, userId: inviteeUserId, status: 'INVITED', role: 'MEMBER' },
  })
}

export async function respondToInvite(
  prisma: PrismaClient,
  membershipId: string,
  respondingUserId: string,
  accept: boolean,
): Promise<GroupMembership> {
  const membership = await prisma.groupMembership.findUnique({ where: { id: membershipId } })
  if (!membership) {
    throw new AppError('NOT_FOUND', 'Invite not found')
  }
  if (membership.userId !== respondingUserId) {
    throw new AppError('NOT_AUTHORIZED', 'Only the invitee can respond to this invite')
  }
  if (membership.status !== 'INVITED') {
    throw new AppError('INVALID_STATE', 'This invite has already been responded to')
  }

  return prisma.groupMembership.update({
    where: { id: membershipId },
    data: { status: accept ? 'ACCEPTED' : 'DECLINED' },
  })
}

export async function listGroupsForUser(prisma: PrismaClient, userId: string): Promise<Group[]> {
  const memberships = await prisma.groupMembership.findMany({
    where: { userId, status: 'ACCEPTED' },
    include: { group: true },
  })
  return memberships.map((m) => m.group)
}

export async function getGroupDetail(prisma: PrismaClient, groupId: string, requestingUserId: string) {
  await requireAcceptedMembership(prisma, groupId, requestingUserId)

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: true } } },
  })
  if (!group) {
    throw new AppError('NOT_FOUND', 'Group not found')
  }
  return group
}

/**
 * Deleting a group, for everyone.
 *
 * Unlike the quorum, which any accepted member can set, this is the owner's
 * alone. Both are "changing how the group works" — the difference is that a
 * quorum someone disagrees with can be changed back, and a group someone
 * deletes is gone from four other people's app with nothing to undo it.
 *
 * The group's proposals go with it, including ones already confirmed. A
 * proposal is Spont's answer to "when are this particular set of people
 * free" — outliving the set would leave a plan nobody can open. Callers are
 * expected to say how many upcoming plans that cancels before asking.
 *
 * Deletes are explicit rather than leaning on a schema cascade: the group
 * relations don't declare one, and spelling out the order here keeps the
 * blast radius visible — the same reason `resetDb` spells it out.
 */
export async function deleteGroup(
  prisma: PrismaClient,
  groupId: string,
  requestingUserId: string,
): Promise<void> {
  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) {
    throw new AppError('NOT_FOUND', 'Group not found')
  }
  if (group.ownerId !== requestingUserId) {
    throw new AppError('NOT_AUTHORIZED', 'Only whoever started this group can delete it')
  }

  await prisma.$transaction([
    prisma.proposalParticipant.deleteMany({ where: { proposal: { groupId } } }),
    prisma.proposal.deleteMany({ where: { groupId } }),
    prisma.groupMembership.deleteMany({ where: { groupId } }),
    prisma.group.delete({ where: { id: groupId } }),
  ])
}

/**
 * How many plans this group still has ahead of it — what a member is about
 * to cancel by deleting it. Past proposals aren't counted: they've either
 * happened or been missed, and warning about them would inflate the number
 * that's meant to give someone pause.
 */
export async function countUpcomingGroupProposals(
  prisma: PrismaClient,
  groupId: string,
  now: Date = new Date(),
): Promise<number> {
  return prisma.proposal.count({
    where: { groupId, startsAt: { gt: now }, status: { in: ['OPEN', 'CONFIRMED'] } },
  })
}

/**
 * Leaving a group you're in.
 *
 * The owner is deliberately excluded. Not because their membership is worth
 * more, but because "leave" and "delete" would become the same act for the
 * last person holding the group — and handing the group to someone else is a
 * different decision, with its own question of who gets it. An owner who
 * wants out today deletes; handing over is worth its own change.
 *
 * The leaver comes off the group's future proposals too. A proposal is a
 * question put to a specific set of people, and staying on the list after
 * leaving would keep asking someone about a group they've left. Anything left
 * with fewer than two people isn't a hangout, so it goes.
 */
export async function leaveGroup(
  prisma: PrismaClient,
  groupId: string,
  userId: string,
  now: Date = new Date(),
): Promise<void> {
  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) {
    throw new AppError('NOT_FOUND', 'Group not found')
  }
  if (group.ownerId === userId) {
    throw new AppError(
      'INVALID_STATE',
      'You started this group, so you can delete it but not leave it',
    )
  }

  await requireAcceptedMembership(prisma, groupId, userId)

  // Only ahead of us: a proposal that has already started is history, and
  // rewriting who was at it would be a lie about something that happened.
  const upcoming = await prisma.proposal.findMany({
    where: { groupId, startsAt: { gt: now } },
    include: { participants: true },
  })

  const emptied = upcoming
    .filter((p) => p.participants.filter((x) => x.userId !== userId).length < 2)
    .map((p) => p.id)

  await prisma.$transaction([
    prisma.proposalParticipant.deleteMany({
      where: { userId, proposal: { groupId, startsAt: { gt: now } } },
    }),
    prisma.proposalParticipant.deleteMany({ where: { proposalId: { in: emptied } } }),
    prisma.proposal.deleteMany({ where: { id: { in: emptied } } }),
    prisma.groupMembership.delete({ where: { groupId_userId: { groupId, userId } } }),
  ])
}
