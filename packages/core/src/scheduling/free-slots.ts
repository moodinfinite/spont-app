import type { BusyBlock, DateRange } from '../calendar-provider/types'

/** A window of time somebody is free. */
export interface FreeWindow {
  start: Date
  end: Date
}

/** A window that enough people share, and who those people are. */
export interface SharedWindow extends FreeWindow {
  userIds: string[]
}

export interface Availability {
  userId: string
  busy: BusyBlock[]
}

export interface MatchOptions {
  /**
   * Minutes the hangout itself should last. Where two people's preferences
   * differ, the caller passes the shorter of the two — the smaller number is
   * the one both are comfortable with.
   */
  durationMinutes: number
  /** Minutes of breathing space required either side of the hangout. */
  paddingMinutes: number
  /**
   * How many participants must share a window for it to count. 1:1s pass 2
   * (everyone); groups pass 2 as well, because a group hangout with two
   * people who actually turn up beats a perfect window nobody has.
   */
  minParticipants: number
}

const MINUTE = 60 * 1000

/**
 * Invert busy blocks into the gaps between them, clipped to `range`.
 * Overlapping and unsorted input is fine — blocks are merged first.
 */
export function freeWindows(busy: BusyBlock[], range: DateRange): FreeWindow[] {
  const merged = mergeBlocks(
    busy
      .map((b) => ({ start: b.start, end: b.end }))
      .filter((b) => b.end > range.start && b.start < range.end),
  )

  const windows: FreeWindow[] = []
  let cursor = range.start

  for (const block of merged) {
    const blockStart = block.start < range.start ? range.start : block.start
    if (blockStart > cursor) windows.push({ start: cursor, end: blockStart })
    if (block.end > cursor) cursor = block.end
  }

  if (cursor < range.end) windows.push({ start: cursor, end: range.end })
  return windows
}

/**
 * Windows shared by at least `minParticipants` people and long enough to hold
 * the hangout plus its padding. Returned in chronological order.
 */
export function sharedWindows(
  availability: Availability[],
  range: DateRange,
  options: MatchOptions,
): SharedWindow[] {
  const needed = (options.durationMinutes + options.paddingMinutes * 2) * MINUTE

  // Every free window's edge is a point where the set of available people
  // can change, so those edges are the only boundaries worth testing.
  const perUser = availability.map((a) => ({
    userId: a.userId,
    windows: freeWindows(a.busy, range),
  }))

  const edges = new Set<number>([range.start.getTime(), range.end.getTime()])
  for (const user of perUser) {
    for (const w of user.windows) {
      edges.add(w.start.getTime())
      edges.add(w.end.getTime())
    }
  }
  const points = Array.from(edges).sort((a, b) => a - b)

  const segments: SharedWindow[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]
    const end = points[i + 1]
    if (end <= start) continue

    const free = perUser
      .filter((u) => u.windows.some((w) => w.start.getTime() <= start && w.end.getTime() >= end))
      .map((u) => u.userId)

    if (free.length < options.minParticipants) continue

    // Fold into the previous segment when the same people are still free,
    // so an unchanged run doesn't come back chopped at every edge.
    const previous = segments[segments.length - 1]
    if (previous && previous.end.getTime() === start && sameUsers(previous.userIds, free)) {
      previous.end = new Date(end)
      continue
    }
    segments.push({ start: new Date(start), end: new Date(end), userIds: free })
  }

  return segments.filter((s) => s.end.getTime() - s.start.getTime() >= needed)
}

/**
 * The hangout itself, placed inside a shared window with padding either side.
 * Returns null when the window can't hold it.
 */
export function placeHangout(
  window: SharedWindow,
  options: MatchOptions,
): { start: Date; end: Date } | null {
  const start = window.start.getTime() + options.paddingMinutes * MINUTE
  const end = start + options.durationMinutes * MINUTE
  if (end + options.paddingMinutes * MINUTE > window.end.getTime()) return null
  return { start: new Date(start), end: new Date(end) }
}

/** The length both people are comfortable with is the shorter of the two. */
export function reconcileDuration(preferences: number[]): number {
  return Math.min(...preferences)
}

function sameUsers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((id, i) => id === sortedB[i])
}

function mergeBlocks(blocks: FreeWindow[]): FreeWindow[] {
  const sorted = [...blocks].sort((x, y) => x.start.getTime() - y.start.getTime())
  const merged: FreeWindow[] = []

  for (const block of sorted) {
    const last = merged[merged.length - 1]
    if (last && block.start <= last.end) {
      if (block.end > last.end) last.end = block.end
    } else {
      merged.push({ start: block.start, end: block.end })
    }
  }
  return merged
}
