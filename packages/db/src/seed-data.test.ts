import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from './index'
import { seedDatabase } from './seed-data'

describe('seedDatabase', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('creates 5 users, each with a mock calendar account and 5 events', async () => {
    await seedDatabase(prisma)

    const users = await prisma.user.findMany({
      include: { calendarAccounts: { include: { events: true } } },
    })

    expect(users).toHaveLength(5)
    for (const user of users) {
      expect(user.calendarAccounts).toHaveLength(1)
      expect(user.calendarAccounts[0].provider).toBe('mock')
      expect(user.calendarAccounts[0].events).toHaveLength(5)
    }
  })
})
