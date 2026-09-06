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
