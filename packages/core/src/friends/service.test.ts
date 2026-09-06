import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { AppError } from '../errors'
import { listFriends, listIncomingRequests, respondToFriendRequest, sendFriendRequest } from './service'

describe('friends service', () => {
  beforeEach(async () => {
    await resetDb()
  })

  async function makeUser(name: string) {
    return prisma.user.create({ data: { name, email: `${name.toLowerCase()}@example.com` } })
  }

  it('creates a pending friend request', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')

    const friendship = await sendFriendRequest(prisma, alice.id, bob.id)

    expect(friendship.status).toBe('PENDING')
    expect(friendship.userAId).toBe(alice.id)
    expect(friendship.userBId).toBe(bob.id)
  })

  it('rejects a self friend request', async () => {
    const alice = await makeUser('Alice')

    await expect(sendFriendRequest(prisma, alice.id, alice.id)).rejects.toThrow(AppError)
  })

  it('rejects a duplicate friend request in either direction', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    await sendFriendRequest(prisma, alice.id, bob.id)

    await expect(sendFriendRequest(prisma, alice.id, bob.id)).rejects.toThrow(AppError)
    await expect(sendFriendRequest(prisma, bob.id, alice.id)).rejects.toThrow(AppError)
  })

  it('lets the recipient accept a request', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const friendship = await sendFriendRequest(prisma, alice.id, bob.id)

    const accepted = await respondToFriendRequest(prisma, friendship.id, bob.id, true)

    expect(accepted?.status).toBe('ACCEPTED')
    const aliceFriends = await listFriends(prisma, alice.id)
    expect(aliceFriends.map((u) => u.id)).toContain(bob.id)
  })

  it('rejects a response from someone other than the recipient', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const friendship = await sendFriendRequest(prisma, alice.id, bob.id)

    await expect(respondToFriendRequest(prisma, friendship.id, alice.id, true)).rejects.toThrow(AppError)
  })

  it('removes the request on decline', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const friendship = await sendFriendRequest(prisma, alice.id, bob.id)

    await respondToFriendRequest(prisma, friendship.id, bob.id, false)

    const incoming = await listIncomingRequests(prisma, bob.id)
    expect(incoming).toHaveLength(0)
  })
})
