import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from './index'
import { EVENT_TEMPLATES, SEED_USERS, seedDatabase } from './seed-data'

describe('seedDatabase', () => {
  beforeEach(async () => {
    await resetDb()
  })

  // Counts come from the seed data itself. Hardcoding them meant adding a
  // name broke this test for no real reason, which is what happened.
  it('creates every seeded user, each with a mock calendar account and events', async () => {
    await seedDatabase(prisma)

    const users = await prisma.user.findMany({
      include: { calendarAccounts: { include: { events: true } } },
    })

    expect(users).toHaveLength(SEED_USERS.length)
    for (const user of users) {
      expect(user.calendarAccounts).toHaveLength(1)
      expect(user.calendarAccounts[0].provider).toBe('mock')
      expect(user.calendarAccounts[0].events).toHaveLength(EVENT_TEMPLATES.length)
    }
  })
})
