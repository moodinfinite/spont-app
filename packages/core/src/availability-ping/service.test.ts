import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { AppError } from '../errors'
import { sendAvailabilityPing } from './service'
import type { PushSender, PushSubscriptionRecord, PushPayload } from './types'

class RecordingPushSender implements PushSender {
  sent: { subscription: PushSubscriptionRecord; payload: PushPayload }[] = []
  async send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<void> {
    this.sent.push({ subscription, payload })
  }
}

class FailingPushSender implements PushSender {
  async send(): Promise<void> {
    throw new Error('network error')
  }
}

describe('sendAvailabilityPing', () => {
  beforeEach(async () => {
    await resetDb()
  })

  async function makeUser(name: string) {
    return prisma.user.create({ data: { name, email: `${name.toLowerCase()}@example.com` } })
  }

  async function makeGroupWithMembers(ownerId: string, memberIds: string[]) {
    return prisma.group.create({
      data: {
        name: 'Close Friends',
        ownerId,
        members: {
          create: [
            { userId: ownerId, status: 'ACCEPTED', role: 'OWNER' },
            ...memberIds.map((userId) => ({ userId, status: 'ACCEPTED' as const, role: 'MEMBER' as const })),
          ],
        },
      },
    })
  }

  it('creates a ping and notifies every other accepted member', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const carol = await makeUser('Carol')
    const group = await makeGroupWithMembers(alice.id, [bob.id, carol.id])

    const ping = await sendAvailabilityPing(prisma, new RecordingPushSender(), alice.id, group.id, "who's around?")

    expect(ping.senderId).toBe(alice.id)
    expect(ping.message).toBe("who's around?")

    const notifications = await prisma.notification.findMany({ where: { type: 'availability_ping' } })
    expect(notifications.map((n) => n.userId).sort()).toEqual([bob.id, carol.id].sort())
  })

  it('rejects a ping from someone not an accepted member of the group', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await makeGroupWithMembers(alice.id, [])

    await expect(
      sendAvailabilityPing(prisma, new RecordingPushSender(), bob.id, group.id),
    ).rejects.toThrow(AppError)
  })

  it('rejects a second ping to the same group within the cooldown window', async () => {
    const alice = await makeUser('Alice')
    const group = await makeGroupWithMembers(alice.id, [])
    const pushSender = new RecordingPushSender()
    await sendAvailabilityPing(prisma, pushSender, alice.id, group.id)

    await expect(sendAvailabilityPing(prisma, pushSender, alice.id, group.id)).rejects.toThrow(AppError)
  })

  it('sends a push to every registered device of each recipient', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await makeGroupWithMembers(alice.id, [bob.id])
    await prisma.pushSubscription.createMany({
      data: [
        { userId: bob.id, endpoint: 'https://push.example/bob-phone', p256dh: 'key1', auth: 'auth1' },
        { userId: bob.id, endpoint: 'https://push.example/bob-laptop', p256dh: 'key2', auth: 'auth2' },
      ],
    })

    const pushSender = new RecordingPushSender()
    await sendAvailabilityPing(prisma, pushSender, alice.id, group.id)

    expect(pushSender.sent.map((s) => s.subscription.endpoint).sort()).toEqual([
      'https://push.example/bob-laptop',
      'https://push.example/bob-phone',
    ])
  })

  it('does not let a push delivery failure stop the ping from succeeding', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await makeGroupWithMembers(alice.id, [bob.id])
    await prisma.pushSubscription.create({
      data: { userId: bob.id, endpoint: 'https://push.example/bob', p256dh: 'key', auth: 'auth' },
    })

    const ping = await sendAvailabilityPing(prisma, new FailingPushSender(), alice.id, group.id)

    expect(ping).toBeDefined()
    const notifications = await prisma.notification.findMany({ where: { type: 'availability_ping' } })
    expect(notifications).toHaveLength(1)
  })
})
