import type { PrismaClient } from '@prisma/client'

function daysFromNow(days: number, hour: number): Date {
  const date = new Date()
  date.setHours(hour, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

export const SEED_USERS = [
  { name: 'Raghav', email: 'raghav@example.com' },
  { name: 'Jeff', email: 'jeff@example.com' },
  { name: 'Edward', email: 'edward@example.com' },
  { name: 'Ming', email: 'ming@example.com' },
  { name: 'Rod', email: 'rod@example.com' },
  { name: 'John', email: 'john@example.com' },
]

export const EVENT_TEMPLATES = [
  { dayOffset: 1, startHour: 9, endHour: 10, rawLabel: 'Gym' },
  { dayOffset: 1, startHour: 13, endHour: 17, rawLabel: 'Client Call' },
  { dayOffset: 3, startHour: 19, endHour: 21, rawLabel: 'Date Night' },
  { dayOffset: 5, startHour: 18, endHour: 20, rawLabel: 'Family Dinner' },
  { dayOffset: 7, startHour: 10, endHour: 12, rawLabel: 'Errands' },
]

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  for (const seedUser of SEED_USERS) {
    const user = await prisma.user.create({ data: seedUser })
    const account = await prisma.calendarAccount.create({
      data: { userId: user.id, provider: 'mock', externalId: `mock-${user.id}` },
    })
    await prisma.calendarEvent.createMany({
      data: EVENT_TEMPLATES.map((tmpl) => ({
        calendarAccountId: account.id,
        title: tmpl.rawLabel,
        startsAt: daysFromNow(tmpl.dayOffset, tmpl.startHour),
        endsAt: daysFromNow(tmpl.dayOffset, tmpl.endHour),
        rawLabel: tmpl.rawLabel,
        isBusy: true,
      })),
    })
  }
}
