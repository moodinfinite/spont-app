import type { PrismaClient, CategoryVisibility } from '@spont/db'
import { AppError } from '../errors'

export async function getVisibilitySettings(
  prisma: PrismaClient,
  userId: string,
): Promise<CategoryVisibility[]> {
  return prisma.categoryVisibility.findMany({
    where: { userId },
    include: { category: true },
  })
}

export async function updateVisibility(
  prisma: PrismaClient,
  userId: string,
  categoryId: string,
  displayMode: 'CATEGORY_NAME' | 'BUSY_ONLY' | 'HIDDEN',
): Promise<CategoryVisibility> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) throw new AppError('NOT_FOUND', 'Category not found')

  return prisma.categoryVisibility.upsert({
    where: { userId_categoryId: { userId, categoryId } },
    create: { userId, categoryId, displayMode },
    update: { displayMode },
  })
}
