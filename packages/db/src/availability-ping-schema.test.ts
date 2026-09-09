import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from './index'

describe('AvailabilityPing and PushSubscription schema', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('creates and reads back an AvailabilityPing with its relations', async () => {
    const alice = await prisma.user.create({ data: { name: 'Alice', email: 'alice@example.com' } })
    const group = await prisma.group.create({ data: { name: 'Close Friends', ownerId: alice.id } })

    const ping = await prisma.availabilityPing.create({
      data: { senderId: alice.id, groupId: group.id, message: "who's around?" },
    })

    const found = await prisma.availabilityPing.findUniqueOrThrow({ where: { id: ping.id } })
    expect(found.message).toBe("who's around?")
    expect(found.windowEnd).toBeNull()
    expect(found.windowStart).toBeInstanceOf(Date)
  })

  it('creates a PushSubscription and enforces a unique endpoint', async () => {
    const alice = await prisma.user.create({ data: { name: 'Alice', email: 'alice@example.com' } })

    await prisma.pushSubscription.create({
      data: { userId: alice.id, endpoint: 'https://push.example/alice', p256dh: 'key', auth: 'auth' },
    })

    await expect(
      prisma.pushSubscription.create({
        data: { userId: alice.id, endpoint: 'https://push.example/alice', p256dh: 'key2', auth: 'auth2' },
      }),
    ).rejects.toThrow()
  })
})
