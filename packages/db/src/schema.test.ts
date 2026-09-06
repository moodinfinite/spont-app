import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from './index'

describe('schema', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('creates and reads back a user with a calendar account and event', async () => {
    const user = await prisma.user.create({ data: { name: 'Alice', email: 'alice@example.com' } })
    const account = await prisma.calendarAccount.create({
      data: { userId: user.id, provider: 'mock', externalId: 'mock-1' },
    })
    await prisma.calendarEvent.create({
      data: {
        calendarAccountId: account.id,
        title: 'Gym',
        startsAt: new Date('2026-01-01T10:00:00Z'),
        endsAt: new Date('2026-01-01T11:00:00Z'),
        rawLabel: 'Gym',
      },
    })

    const found = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { calendarAccounts: { include: { events: true } } },
    })

    expect(found.calendarAccounts).toHaveLength(1)
    expect(found.calendarAccounts[0].events).toHaveLength(1)
    expect(found.calendarAccounts[0].events[0].rawLabel).toBe('Gym')
  })

  it('resets cleanly between tests', async () => {
    const users = await prisma.user.findMany()
    expect(users).toHaveLength(0)
  })
})
