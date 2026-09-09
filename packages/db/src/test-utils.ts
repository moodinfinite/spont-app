import { prisma } from './client'

/**
 * Wipe everything, in an order the foreign keys allow.
 *
 * Proposals have to go before users: a ProposalParticipant points at one, so
 * deleting users first fails on the constraint. That went unnoticed while
 * nothing created proposals — the rows existed only in the schema — and broke
 * every database test the moment the matcher started writing them.
 */
export async function resetDb(): Promise<void> {
  await prisma.proposalParticipant.deleteMany()
  await prisma.proposal.deleteMany()
  await prisma.groupMembership.deleteMany()
  await prisma.group.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.calendarEvent.deleteMany()
  await prisma.calendarAccount.deleteMany()
  await prisma.user.deleteMany()
}
