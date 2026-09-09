import { prisma } from '@spont/db'
import { freeWindows, type BusyBlock } from '@spont/core'
import { fetchBusy } from './google-calendar'

/**
 * "When is this person busy, and where are their usable gaps" — independent
 * of who keeps the calendar.
 *
 * Two sources answer that today: a real Google account, and the events we
 * hold in our own table (the seeded test users, and anything imported).
 * Keeping the dispatch here rather than in google-calendar.ts means the page
 * doesn't have to know which kind of account it's looking at, and a third
 * provider is one branch rather than a new call site everywhere.
 */

/** The window a day is drawn across. Outside this, "free" isn't useful. */
const DAY_START_HOUR = 8
const DAY_END_HOUR = 23

export interface DaySegment {
  /** Percent across the visible day, 0–100. */
  left: number
  width: number
}

export interface DayView {
  label: string
  busy: DaySegment[]
  /** The first gap long enough to hold a hangout, if there is one. */
  open: DaySegment | null
}

export interface CalendarSource {
  id: string
  provider: string
}

export async function busyBetween(
  account: CalendarSource,
  start: Date,
  end: Date,
): Promise<BusyBlock[] | null> {
  if (account.provider === 'google') return fetchBusy(account.id, start, end)

  const events = await prisma.calendarEvent.findMany({
    where: {
      calendarAccountId: account.id,
      isBusy: true,
      endsAt: { gt: start },
      startsAt: { lt: end },
    },
    orderBy: { startsAt: 'asc' },
  })

  return events.map((e) => ({ start: e.startsAt, end: e.endsAt, rawLabel: e.rawLabel }))
}

/**
 * The next `days` days as drawable bars: where you're busy, and the first gap
 * worth proposing into.
 *
 * This is what the empty feed shows. It's your own calendar rather than an
 * overlap, because until someone else joins there is no overlap — and a
 * screen that shows the engine looking beats one that asserts it's working.
 */
export async function weekView(
  account: CalendarSource,
  options: { days?: number; minMinutes?: number } = {},
): Promise<DayView[] | null> {
  const days = options.days ?? 7
  const minMinutes = options.minMinutes ?? 120

  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000)

  const busy = await busyBetween(account, from, to)
  if (busy === null) return null

  const dayLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
  const now = new Date()
  const out: DayView[] = []

  for (let i = 0; i < days; i++) {
    const dayStart = new Date(from)
    dayStart.setDate(dayStart.getDate() + i)
    dayStart.setHours(DAY_START_HOUR, 0, 0, 0)

    const dayEnd = new Date(dayStart)
    dayEnd.setHours(DAY_END_HOUR, 0, 0, 0)

    const span = dayEnd.getTime() - dayStart.getTime()
    const pct = (t: number) => ((t - dayStart.getTime()) / span) * 100
    const clamp = (n: number) => Math.max(0, Math.min(100, n))

    const segments = busy
      .filter((b) => b.end > dayStart && b.start < dayEnd)
      .map((b) => {
        const left = clamp(pct(b.start.getTime()))
        const right = clamp(pct(b.end.getTime()))
        // A sliver still has to be visible, or a 20-minute meeting vanishes.
        return { left, width: Math.max(right - left, 1.5) }
      })

    // Don't light a window that has already started.
    const searchFrom = dayStart < now ? now : dayStart
    let open: DaySegment | null = null

    if (searchFrom < dayEnd) {
      for (const w of freeWindows(busy, { start: searchFrom, end: dayEnd })) {
        const minutes = (w.end.getTime() - w.start.getTime()) / 60000
        if (minutes < minMinutes) continue
        const left = clamp(pct(w.start.getTime()))
        const right = clamp(pct(w.end.getTime()))
        open = { left, width: Math.max(right - left, 2) }
        break
      }
    }

    out.push({ label: dayLabel.format(dayStart), busy: segments, open })
  }

  return out
}
