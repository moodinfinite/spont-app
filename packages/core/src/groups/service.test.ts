import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { AppError } from '../errors'
import {
  createGroup,
  getGroupDetail,
  inviteMember,
  listGroupsForUser,
  respondToInvite,
} from './service'

describe('groups service', () => {
  beforeEach(async () => {
    await resetDb()
  })

  async function makeUser(name: string) {
    return prisma.user.create({ data: { name, email: `${name.toLowerCase()}@example.com` } })
  }

  it('creates a group with the creator as an accepted owner', async () => {
    const alice = await makeUser('Alice')

    const group = await createGroup(prisma, alice.id, 'College friends')

    const detail = await getGroupDetail(prisma, group.id, alice.id)
    expect(detail.members).toHaveLength(1)
    expect(detail.members[0]).toMatchObject({ userId: alice.id, status: 'ACCEPTED', role: 'OWNER' })
  })

  it('lets an accepted member invite someone new', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await createGroup(prisma, alice.id, 'Trip planning')

    const membership = await inviteMember(prisma, group.id, alice.id, bob.id)

    expect(membership.status).toBe('INVITED')
    expect(membership.role).toBe('MEMBER')
  })

  it('rejects an invite from a non-member', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const carol = await makeUser('Carol')
    const group = await createGroup(prisma, alice.id, 'Trip planning')

    await expect(inviteMember(prisma, group.id, bob.id, carol.id)).rejects.toThrow(AppError)
  })

  it('rejects inviting someone already a member', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await createGroup(prisma, alice.id, 'Trip planning')
    await inviteMember(prisma, group.id, alice.id, bob.id)

    await expect(inviteMember(prisma, group.id, alice.id, bob.id)).rejects.toThrow(AppError)
  })

  it('lets an invitee accept and then shows up in their group list', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await createGroup(prisma, alice.id, 'Trip planning')
    const membership = await inviteMember(prisma, group.id, alice.id, bob.id)

    await respondToInvite(prisma, membership.id, bob.id, true)

    const bobGroups = await listGroupsForUser(prisma, bob.id)
    expect(bobGroups.map((g) => g.id)).toContain(group.id)
  })

  it('rejects a response from someone other than the invitee', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await createGroup(prisma, alice.id, 'Trip planning')
    const membership = await inviteMember(prisma, group.id, alice.id, bob.id)

    await expect(respondToInvite(prisma, membership.id, alice.id, true)).rejects.toThrow(AppError)
  })

  it('rejects viewing group detail for a non-member', async () => {
    const alice = await makeUser('Alice')
    const carol = await makeUser('Carol')
    const group = await createGroup(prisma, alice.id, 'Trip planning')

    await expect(getGroupDetail(prisma, group.id, carol.id)).rejects.toThrow(AppError)
  })
})
