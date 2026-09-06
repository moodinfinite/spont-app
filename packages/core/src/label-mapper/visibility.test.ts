import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { getVisibilitySettings, updateVisibility } from './visibility'

describe('visibility service', () => {
  beforeEach(async () => {
    await resetDb()
  })

  async function setup() {
    const user = await prisma.user.create({
      data: { name: 'Alice', email: 'alice@example.com' },
    })
    const category = await prisma.category.create({
      data: { name: 'Work', displayOrder: 1 },
    })
    return { user, category }
  }

  it('returns empty array when no visibility rows exist', async () => {
    const { user } = await setup()
    const settings = await getVisibilitySettings(prisma, user.id)
    expect(settings).toHaveLength(0)
  })

  it('creates a visibility setting via updateVisibility', async () => {
    const { user, category } = await setup()
    const result = await updateVisibility(prisma, user.id, category.id, 'BUSY_ONLY')
    expect(result.displayMode).toBe('BUSY_ONLY')
    expect(result.userId).toBe(user.id)
    expect(result.categoryId).toBe(category.id)
  })

  it('updates an existing visibility setting', async () => {
    const { user, category } = await setup()
    await updateVisibility(prisma, user.id, category.id, 'BUSY_ONLY')
    const updated = await updateVisibility(prisma, user.id, category.id, 'HIDDEN')
    expect(updated.displayMode).toBe('HIDDEN')

    const all = await prisma.categoryVisibility.findMany({ where: { userId: user.id } })
    expect(all).toHaveLength(1)
  })

  it('returns all visibility settings for a user', async () => {
    const { user, category } = await setup()
    const cat2 = await prisma.category.create({ data: { name: 'Social', displayOrder: 3 } })
    await updateVisibility(prisma, user.id, category.id, 'BUSY_ONLY')
    await updateVisibility(prisma, user.id, cat2.id, 'HIDDEN')
    const settings = await getVisibilitySettings(prisma, user.id)
    expect(settings).toHaveLength(2)
  })
})
