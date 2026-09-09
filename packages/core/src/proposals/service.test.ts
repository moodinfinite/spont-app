import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { AppError } from '../errors'
import { createInvitedProposal } from './service'
import { viewFor } from './rules'

describe('createInvitedProposal', () => {
  beforeEach(async () => {
    await resetDb()
  })

  const now = new Date('2026-09-10T12:00:00Z')
  const start = new Date('2026-09-12T18:00:00Z')
  const end = new Date('2026-09-12T20:00:00Z')

  async function makeUser(name: string) {
    return prisma.user.create({ data: { name, email: `${name.toLowerCase()}@example.com` } })
  }

  async function befriend(a: { id: string }, b: { id: string }) {
    return prisma.friendship.create({
      data: { userAId: a.id, userBId: b.id, status: 'ACCEPTED' },
    })
  }

  it('records who asked, and that a person asked at all', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    await befriend(alice, bob)

    const proposal = await createInvitedProposal(
      prisma,
      { createdById: alice.id, withUserIds: [bob.id], startsAt: start, endsAt: end },
      now,
    )

    expect(proposal.origin).toBe('INVITED')
    expect(proposal.createdById).toBe(alice.id)
    expect(proposal.groupId).toBeNull()
  })

  it('counts the asker as already in, and everyone else as pending', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const carol = await makeUser('Carol')
    await befriend(alice, bob)
    await befriend(alice, carol)

    const proposal = await createInvitedProposal(
      prisma,
      { createdById: alice.id, withUserIds: [bob.id, carol.id], startsAt: start, endsAt: end },
      now,
    )

    const participants = await prisma.proposalParticipant.findMany({
      where: { proposalId: proposal.id },
    })
    const byUser = Object.fromEntries(participants.map((p) => [p.userId, p.response]))

    expect(byUser[alice.id]).toBe('ACCEPTED')
    expect(byUser[bob.id]).toBe('PENDING')
    expect(byUser[carol.id]).toBe('PENDING')
  })

  it('reads as waiting on the others for the asker, and as a question for them', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    await befriend(alice, bob)

    const proposal = await createInvitedProposal(
      prisma,
      { createdById: alice.id, withUserIds: [bob.id], startsAt: start, endsAt: end },
      now,
    )
    const participants = await prisma.proposalParticipant.findMany({
      where: { proposalId: proposal.id },
    })
    const state = {
      startsAt: proposal.startsAt,
      isGroup: false,
      participants: participants.map((p) => ({ userId: p.userId, response: p.response })),
    }

    expect(viewFor(state, alice.id, now)).toBe('WAITING_ON_OTHERS')
    expect(viewFor(state, bob.id, now)).toBe('AWAITING_YOU')
  })

  it('refuses someone who is not an accepted friend', async () => {
    const alice = await makeUser('Alice')
    const stranger = await makeUser('Stranger')

    await expect(
      createInvitedProposal(
        prisma,
        { createdById: alice.id, withUserIds: [stranger.id], startsAt: start, endsAt: end },
        now,
      ),
    ).rejects.toThrow(AppError)
  })

  it('refuses the whole invite if any one person is not a friend', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const stranger = await makeUser('Stranger')
    await befriend(alice, bob)

    await expect(
      createInvitedProposal(
        prisma,
        { createdById: alice.id, withUserIds: [bob.id, stranger.id], startsAt: start, endsAt: end },
        now,
      ),
    ).rejects.toThrow(AppError)

    expect(await prisma.proposal.count()).toBe(0)
  })

  it('refuses a pending friendship — asked is not the same as agreed', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    await prisma.friendship.create({
      data: { userAId: alice.id, userBId: bob.id, status: 'PENDING' },
    })

    await expect(
      createInvitedProposal(
        prisma,
        { createdById: alice.id, withUserIds: [bob.id], startsAt: start, endsAt: end },
        now,
      ),
    ).rejects.toThrow(AppError)
  })

  it('refuses a hangout with nobody else in it', async () => {
    const alice = await makeUser('Alice')

    await expect(
      createInvitedProposal(
        prisma,
        { createdById: alice.id, withUserIds: [alice.id], startsAt: start, endsAt: end },
        now,
      ),
    ).rejects.toThrow(AppError)
  })

  it('refuses a time that has already passed', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    await befriend(alice, bob)

    await expect(
      createInvitedProposal(
        prisma,
        {
          createdById: alice.id,
          withUserIds: [bob.id],
          startsAt: new Date('2026-09-01T18:00:00Z'),
          endsAt: new Date('2026-09-01T20:00:00Z'),
        },
        now,
      ),
    ).rejects.toThrow(AppError)
  })

  it('ignores a duplicated invitee rather than failing on the constraint', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    await befriend(alice, bob)

    const proposal = await createInvitedProposal(
      prisma,
      { createdById: alice.id, withUserIds: [bob.id, bob.id], startsAt: start, endsAt: end },
      now,
    )

    expect(await prisma.proposalParticipant.count({ where: { proposalId: proposal.id } })).toBe(2)
  })
})
