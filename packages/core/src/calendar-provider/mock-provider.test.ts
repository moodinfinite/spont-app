import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { MockCalendarProvider } from './mock-provider'

describe('MockCalendarProvider', () => {
  beforeEach(async () => {
    await resetDb()
  })

  async function makeAccount() {
    const user = await prisma.user.create({
      data: { name: 'Alice', email: `alice-${Date.now()}-${Math.random()}@example.com` },
    })
    return prisma.calendarAccount.create({
      data: { userId: user.id, provider: 'mock', externalId: 'mock-1' },
    })
  }

  it('lists busy blocks overlapping a range', async () => {
    const account = await makeAccount()
    const provider = new MockCalendarProvider(prisma)

    await prisma.calendarEvent.create({
      data: {
        calendarAccountId: account.id,
        title: 'Gym',
        startsAt: new Date('2026-01-01T10:00:00Z'),
        endsAt: new Date('2026-01-01T11:00:00Z'),
        rawLabel: 'Gym',
        isBusy: true,
      },
    })
    await prisma.calendarEvent.create({
      data: {
        calendarAccountId: account.id,
        title: 'Out of range',
        startsAt: new Date('2026-02-01T10:00:00Z'),
        endsAt: new Date('2026-02-01T11:00:00Z'),
        rawLabel: 'Work',
        isBusy: true,
      },
    })

    const blocks = await provider.listBusyBlocks(account.id, {
      start: new Date('2026-01-01T00:00:00Z'),
      end: new Date('2026-01-02T00:00:00Z'),
    })

    expect(blocks).toHaveLength(1)
    expect(blocks[0].rawLabel).toBe('Gym')
  })

  it('lists distinct raw labels for an account', async () => {
    const account = await makeAccount()
    const provider = new MockCalendarProvider(prisma)

    await prisma.calendarEvent.createMany({
      data: [
        {
          calendarAccountId: account.id,
          title: 'Gym',
          startsAt: new Date('2026-01-01T10:00:00Z'),
          endsAt: new Date('2026-01-01T11:00:00Z'),
          rawLabel: 'Gym',
        },
        {
          calendarAccountId: account.id,
          title: 'Gym again',
          startsAt: new Date('2026-01-02T10:00:00Z'),
          endsAt: new Date('2026-01-02T11:00:00Z'),
          rawLabel: 'Gym',
        },
        {
          calendarAccountId: account.id,
          title: 'Work',
          startsAt: new Date('2026-01-03T10:00:00Z'),
          endsAt: new Date('2026-01-03T11:00:00Z'),
          rawLabel: 'Work',
        },
      ],
    })

    const labels = await provider.listRawLabels(account.id)

    expect(labels.sort()).toEqual(['Gym', 'Work'])
  })

  it('creates an event', async () => {
    const account = await makeAccount()
    const provider = new MockCalendarProvider(prisma)

    const created = await provider.createEvent(account.id, {
      title: 'Dinner',
      start: new Date('2026-01-05T18:00:00Z'),
      end: new Date('2026-01-05T20:00:00Z'),
    })

    expect(created.title).toBe('Dinner')
    const stored = await prisma.calendarEvent.findUnique({ where: { id: created.id } })
    expect(stored?.isBusy).toBe(true)
  })
})
