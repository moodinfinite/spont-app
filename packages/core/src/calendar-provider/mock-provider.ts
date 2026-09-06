import type { PrismaClient } from '@spont/db'
import type { CalendarProvider, DateRange, BusyBlock, NewEvent, CreatedEvent } from './types'

export class MockCalendarProvider implements CalendarProvider {
  constructor(private readonly prisma: PrismaClient) {}

  async listBusyBlocks(calendarAccountId: string, range: DateRange): Promise<BusyBlock[]> {
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        calendarAccountId,
        isBusy: true,
        startsAt: { lt: range.end },
        endsAt: { gt: range.start },
      },
    })
    return events.map((e) => ({ start: e.startsAt, end: e.endsAt, rawLabel: e.rawLabel }))
  }

  async listRawLabels(calendarAccountId: string): Promise<string[]> {
    const events = await this.prisma.calendarEvent.findMany({
      where: { calendarAccountId, rawLabel: { not: null } },
      distinct: ['rawLabel'],
      select: { rawLabel: true },
    })
    return events.map((e) => e.rawLabel as string)
  }

  async createEvent(calendarAccountId: string, event: NewEvent): Promise<CreatedEvent> {
    const created = await this.prisma.calendarEvent.create({
      data: {
        calendarAccountId,
        title: event.title,
        startsAt: event.start,
        endsAt: event.end,
        isBusy: true,
      },
    })
    return { id: created.id, title: created.title, start: created.startsAt, end: created.endsAt }
  }
}
