import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { mapLabelByRule } from './rules'
import { ensureMappings, overrideMapping, resetMapping } from './service'

describe('mapLabelByRule', () => {
  it('matches exact labels', () => {
    expect(mapLabelByRule('Gym')).toBe('Health/Fitness')
    expect(mapLabelByRule('Client Call')).toBe('Work')
    expect(mapLabelByRule('Date Night')).toBe('Personal')
    expect(mapLabelByRule('Family Dinner')).toBe('Family')
    expect(mapLabelByRule('Errands')).toBe('Errands')
    expect(mapLabelByRule('Happy Hour')).toBe('Social')
  })

  it('matches case-insensitively', () => {
    expect(mapLabelByRule('GYM')).toBe('Health/Fitness')
    expect(mapLabelByRule('client call')).toBe('Work')
  })

  it('matches substrings', () => {
    expect(mapLabelByRule('Morning Gym Session')).toBe('Health/Fitness')
    expect(mapLabelByRule('Weekly Standup')).toBe('Work')
  })

  it('returns null for unmatched labels', () => {
    expect(mapLabelByRule('Piano Lesson')).toBeNull()
    expect(mapLabelByRule('Random Event')).toBeNull()
  })
})

describe('ensureMappings', () => {
  beforeEach(async () => {
    await resetDb()
  })

  async function seedUserWithLabels(labels: string[]) {
    const categories = await Promise.all([
      prisma.category.create({ data: { name: 'Work', displayOrder: 1 } }),
      prisma.category.create({ data: { name: 'Personal', displayOrder: 2 } }),
      prisma.category.create({ data: { name: 'Social', displayOrder: 3 } }),
      prisma.category.create({ data: { name: 'Health/Fitness', displayOrder: 4 } }),
      prisma.category.create({ data: { name: 'Family', displayOrder: 5 } }),
      prisma.category.create({ data: { name: 'Errands', displayOrder: 6 } }),
      prisma.category.create({ data: { name: 'Other', displayOrder: 7 } }),
    ])
    const user = await prisma.user.create({
      data: { name: 'Alice', email: 'alice@example.com' },
    })
    const account = await prisma.calendarAccount.create({
      data: { userId: user.id, provider: 'mock', externalId: `mock-${user.id}` },
    })
    for (const label of labels) {
      await prisma.calendarEvent.create({
        data: {
          calendarAccountId: account.id,
          title: label,
          startsAt: new Date(),
          endsAt: new Date(),
          rawLabel: label,
          isBusy: true,
        },
      })
    }
    return { user, categories }
  }

  it('creates mappings for all unmapped labels', async () => {
    const { user } = await seedUserWithLabels(['Gym', 'Client Call', 'Piano Lesson'])
    const mappings = await ensureMappings(prisma, user.id)
    expect(mappings).toHaveLength(3)

    const gym = mappings.find((m) => m.rawLabel === 'Gym')!
    expect(gym.source).toBe('RULE')

    const piano = mappings.find((m) => m.rawLabel === 'Piano Lesson')!
    expect(piano.source).toBe('RULE')
    const otherCategory = await prisma.category.findFirst({ where: { name: 'Other' } })
    expect(piano.categoryId).toBe(otherCategory!.id)
  })

  it('does not overwrite existing manual mappings', async () => {
    const { user } = await seedUserWithLabels(['Gym'])
    const mappings = await ensureMappings(prisma, user.id)
    const socialCategory = await prisma.category.findFirst({ where: { name: 'Social' } })
    await overrideMapping(prisma, user.id, 'Gym', socialCategory!.id)

    const refreshed = await ensureMappings(prisma, user.id)
    const gym = refreshed.find((m) => m.rawLabel === 'Gym')!
    expect(gym.categoryId).toBe(socialCategory!.id)
    expect(gym.source).toBe('MANUAL')
  })
})

describe('overrideMapping', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('creates a manual mapping', async () => {
    await prisma.category.create({ data: { name: 'Social', displayOrder: 3 } })
    const otherCat = await prisma.category.create({ data: { name: 'Other', displayOrder: 7 } })
    const socialCat = await prisma.category.findFirst({ where: { name: 'Social' } })
    const user = await prisma.user.create({
      data: { name: 'Alice', email: 'alice@example.com' },
    })
    const mapping = await overrideMapping(prisma, user.id, 'Gym', socialCat!.id)
    expect(mapping.source).toBe('MANUAL')
    expect(mapping.categoryId).toBe(socialCat!.id)
  })
})

describe('resetMapping', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('resets a manual mapping back to rule-based', async () => {
    const healthCat = await prisma.category.create({ data: { name: 'Health/Fitness', displayOrder: 4 } })
    const socialCat = await prisma.category.create({ data: { name: 'Social', displayOrder: 3 } })
    await prisma.category.create({ data: { name: 'Other', displayOrder: 7 } })
    const user = await prisma.user.create({
      data: { name: 'Alice', email: 'alice@example.com' },
    })
    await overrideMapping(prisma, user.id, 'Gym', socialCat.id)
    const reset = await resetMapping(prisma, user.id, 'Gym')
    expect(reset.source).toBe('RULE')
    expect(reset.categoryId).toBe(healthCat.id)
  })
})
