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

  it('creates 7 categories', async () => {
    await seedDatabase(prisma)
    const categories = await prisma.category.findMany({ orderBy: { displayOrder: 'asc' } })
    expect(categories).toHaveLength(7)
    expect(categories.map((c) => c.name)).toEqual([
      'Work', 'Personal', 'Social', 'Health/Fitness', 'Family', 'Errands', 'Other',
    ])
  })

  it('creates label mappings for each user', async () => {
    await seedDatabase(prisma)
    const mappings = await prisma.labelMapping.findMany()
    // 5 users * 5 labels = 25 mappings
    expect(mappings).toHaveLength(25)
    expect(mappings.every((m) => m.source === 'RULE')).toBe(true)
  })

  it('creates default category visibility for each user', async () => {
    await seedDatabase(prisma)
    const visibilities = await prisma.categoryVisibility.findMany()
    // 5 users * 7 categories = 35 visibility rows
    expect(visibilities).toHaveLength(35)
    expect(visibilities.every((v) => v.displayMode === 'CATEGORY_NAME')).toBe(true)
  })
})
