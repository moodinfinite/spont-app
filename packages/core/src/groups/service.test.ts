import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { AppError } from '../errors'
import {
  createGroup,
  deleteGroup,
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

  describe('deleting a group', () => {
    async function groupOfTwo() {
      const alice = await makeUser('Alice')
      const bob = await makeUser('Bob')
      const group = await createGroup(prisma, alice.id, 'Trip planning')
      const membership = await inviteMember(prisma, group.id, alice.id, bob.id)
      await respondToInvite(prisma, membership.id, bob.id, true)
      return { alice, bob, group }
    }

    async function proposalFor(groupId: string | null, userIds: string[]) {
      return prisma.proposal.create({
        data: {
          origin: 'SUGGESTED',
          startsAt: new Date('2026-10-01T18:00:00Z'),
          endsAt: new Date('2026-10-01T20:00:00Z'),
          groupId,
          participants: { create: userIds.map((userId) => ({ userId })) },
        },
      })
    }

    it('lets the owner delete it, and it leaves every member\'s list', async () => {
      const { alice, bob, group } = await groupOfTwo()

      await deleteGroup(prisma, group.id, alice.id)

      expect(await prisma.group.findUnique({ where: { id: group.id } })).toBeNull()
      expect(await listGroupsForUser(prisma, alice.id)).toHaveLength(0)
      expect(await listGroupsForUser(prisma, bob.id)).toHaveLength(0)
    })

    it('refuses a member who did not start the group', async () => {
      const { bob, group } = await groupOfTwo()

      await expect(deleteGroup(prisma, group.id, bob.id)).rejects.toThrow(AppError)
      expect(await prisma.group.findUnique({ where: { id: group.id } })).not.toBeNull()
    })

    it('refuses someone outside the group entirely', async () => {
      const { group } = await groupOfTwo()
      const carol = await makeUser('Carol')

      await expect(deleteGroup(prisma, group.id, carol.id)).rejects.toThrow(AppError)
    })

    it('refuses a group that is already gone', async () => {
      const alice = await makeUser('Alice')

      await expect(deleteGroup(prisma, 'no-such-group', alice.id)).rejects.toThrow(AppError)
    })

    it("takes the group's proposals and their participants with it", async () => {
      const { alice, bob, group } = await groupOfTwo()
      const proposal = await proposalFor(group.id, [alice.id, bob.id])

      await deleteGroup(prisma, group.id, alice.id)

      expect(await prisma.proposal.findUnique({ where: { id: proposal.id } })).toBeNull()
      expect(
        await prisma.proposalParticipant.count({ where: { proposalId: proposal.id } }),
      ).toBe(0)
    })

    it('leaves proposals that belong to something else alone', async () => {
      const { alice, bob, group } = await groupOfTwo()
      const other = await createGroup(prisma, alice.id, 'Five-a-side')
      const otherProposal = await proposalFor(other.id, [alice.id])
      // A 1:1 has no group at all, and is the case most likely to be caught
      // by a delete written as "anything involving these people".
      const oneToOne = await proposalFor(null, [alice.id, bob.id])

      await deleteGroup(prisma, group.id, alice.id)

      expect(await prisma.proposal.findUnique({ where: { id: otherProposal.id } })).not.toBeNull()
      expect(await prisma.proposal.findUnique({ where: { id: oneToOne.id } })).not.toBeNull()
      expect(await prisma.proposalParticipant.count({ where: { proposalId: oneToOne.id } })).toBe(2)
    })

    it('leaves the members themselves alone', async () => {
      const { alice, bob, group } = await groupOfTwo()

      await deleteGroup(prisma, group.id, alice.id)

      expect(await prisma.user.count({ where: { id: { in: [alice.id, bob.id] } } })).toBe(2)
    })
  })
})
