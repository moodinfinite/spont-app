import type { PrismaClient, AvailabilityPing } from '@spont/db'
import { AppError } from '../errors'
import type { PushSender } from './types'

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

export async function sendAvailabilityPing(
  prisma: PrismaClient,
  pushSender: PushSender,
  senderId: string,
  groupId: string,
  message?: string,
  windowEnd?: Date,
): Promise<AvailabilityPing> {
  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId: senderId } },
  })
  if (!membership || membership.status !== 'ACCEPTED') {
    throw new AppError('NOT_AUTHORIZED', 'You are not a member of this group')
  }

  const recentPing = await prisma.availabilityPing.findFirst({
    where: {
      senderId,
      groupId,
      createdAt: { gt: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    },
  })
  if (recentPing) {
    throw new AppError('RATE_LIMITED', 'You already pinged this group recently')
  }

  const sender = await prisma.user.findUniqueOrThrow({ where: { id: senderId } })
  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } })
  const ping = await prisma.availabilityPing.create({
    data: { senderId, groupId, message, windowEnd },
  })

  const recipients = await prisma.groupMembership.findMany({
    where: { groupId, status: 'ACCEPTED', userId: { not: senderId } },
    include: { user: { include: { pushSubscriptions: true } } },
  })

  for (const recipient of recipients) {
    await prisma.notification.create({
      data: {
        userId: recipient.userId,
        type: 'availability_ping',
        payload: {
          pingId: ping.id,
          senderId: sender.id,
          senderName: sender.name,
          groupId: group.id,
          groupName: group.name,
          message: ping.message,
          windowStart: ping.windowStart.toISOString(),
          windowEnd: ping.windowEnd ? ping.windowEnd.toISOString() : null,
        },
      },
    })

    for (const sub of recipient.user.pushSubscriptions) {
      try {
        await pushSender.send(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title: `${sender.name} is free`, body: ping.message ?? 'Ping them back!', url: '/' },
        )
      } catch (err) {
        console.error('Push delivery failed', err)
      }
    }
  }

  return ping
}
