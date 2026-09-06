import type { PrismaClient, LabelMapping } from '@spont/db'
import { AppError } from '../errors'
import { mapLabelByRule } from './rules'

export async function ensureMappings(
  prisma: PrismaClient,
  userId: string,
): Promise<LabelMapping[]> {
  const accounts = await prisma.calendarAccount.findMany({ where: { userId } })
  const accountIds = accounts.map((a) => a.id)

  const events = await prisma.calendarEvent.findMany({
    where: { calendarAccountId: { in: accountIds }, rawLabel: { not: null } },
    distinct: ['rawLabel'],
    select: { rawLabel: true },
  })
  const rawLabels = events.map((e) => e.rawLabel as string)

  const existing = await prisma.labelMapping.findMany({ where: { userId } })
  const mappedLabels = new Set(existing.map((m) => m.rawLabel))

  const categories = await prisma.category.findMany()
  const categoryByName = new Map(categories.map((c) => [c.name, c]))
  const otherCategory = categoryByName.get('Other')!

  for (const rawLabel of rawLabels) {
    if (mappedLabels.has(rawLabel)) continue
    const categoryName = mapLabelByRule(rawLabel) ?? 'Other'
    const category = categoryByName.get(categoryName) ?? otherCategory
    await prisma.labelMapping.create({
      data: { userId, rawLabel, categoryId: category.id, source: 'RULE' },
    })
  }

  return prisma.labelMapping.findMany({
    where: { userId },
    include: { category: true },
  })
}

export async function overrideMapping(
  prisma: PrismaClient,
  userId: string,
  rawLabel: string,
  categoryId: string,
): Promise<LabelMapping> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) throw new AppError('NOT_FOUND', 'Category not found')

  return prisma.labelMapping.upsert({
    where: { userId_rawLabel: { userId, rawLabel } },
    create: { userId, rawLabel, categoryId, source: 'MANUAL' },
    update: { categoryId, source: 'MANUAL' },
  })
}

export async function resetMapping(
  prisma: PrismaClient,
  userId: string,
  rawLabel: string,
): Promise<LabelMapping> {
  const categories = await prisma.category.findMany()
  const categoryByName = new Map(categories.map((c) => [c.name, c]))
  const otherCategory = categoryByName.get('Other')!

  const categoryName = mapLabelByRule(rawLabel) ?? 'Other'
  const category = categoryByName.get(categoryName) ?? otherCategory

  return prisma.labelMapping.upsert({
    where: { userId_rawLabel: { userId, rawLabel } },
    create: { userId, rawLabel, categoryId: category.id, source: 'RULE' },
    update: { categoryId: category.id, source: 'RULE' },
  })
}
