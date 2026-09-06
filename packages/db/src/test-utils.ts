import { prisma } from './client'

export async function resetDb(): Promise<void> {
  await prisma.categoryVisibility.deleteMany()
  await prisma.labelMapping.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.groupMembership.deleteMany()
  await prisma.group.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.calendarEvent.deleteMany()
  await prisma.calendarAccount.deleteMany()
  await prisma.user.deleteMany()
  await prisma.category.deleteMany()
}
