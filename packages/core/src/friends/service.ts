import type { PrismaClient, Friendship, User } from '@spont/db'
import { AppError } from '../errors'

export async function sendFriendRequest(
  prisma: PrismaClient,
  fromUserId: string,
  toUserId: string,
): Promise<Friendship> {
  if (fromUserId === toUserId) {
    throw new AppError('SELF_FRIEND_REQUEST', 'You cannot send a friend request to yourself')
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: fromUserId, userBId: toUserId },
        { userAId: toUserId, userBId: fromUserId },
      ],
    },
  })
  if (existing) {
    throw new AppError('FRIENDSHIP_EXISTS', 'A friendship or request already exists between these users')
  }

  return prisma.friendship.create({
    data: { userAId: fromUserId, userBId: toUserId, status: 'PENDING' },
  })
}

export async function respondToFriendRequest(
  prisma: PrismaClient,
  friendshipId: string,
  respondingUserId: string,
  accept: boolean,
): Promise<Friendship | null> {
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship) {
    throw new AppError('NOT_FOUND', 'Friend request not found')
  }
  if (friendship.userBId !== respondingUserId) {
    throw new AppError('NOT_AUTHORIZED', 'Only the recipient can respond to this request')
  }

  if (!accept) {
    await prisma.friendship.delete({ where: { id: friendshipId } })
    return null
  }

  return prisma.friendship.update({ where: { id: friendshipId }, data: { status: 'ACCEPTED' } })
}

export async function listFriends(prisma: PrismaClient, userId: string): Promise<User[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: { userA: true, userB: true },
  })
  /**
   * Sorted by name, because unsorted meant whatever order Postgres felt like
   * returning — a list of people that could reshuffle between two loads for
   * no reason the reader could see. It also gives the accepted-friend
   * animation somewhere definite to land.
   */
  return friendships
    .map((f) => (f.userAId === userId ? f.userB : f.userA))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function listIncomingRequests(prisma: PrismaClient, userId: string) {
  return prisma.friendship.findMany({
    where: { userBId: userId, status: 'PENDING' },
    include: { userA: true },
  })
}

export async function listOutgoingRequests(prisma: PrismaClient, userId: string) {
  return prisma.friendship.findMany({
    where: { userAId: userId, status: 'PENDING' },
    include: { userB: true },
  })
}
