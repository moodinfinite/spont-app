import { describe, expect, it } from 'vitest'
import {
  freeWindows,
  placeHangout,
  reconcileDuration,
  sharedWindows,
  type Availability,
} from './free-slots'

/** Times are UTC; the day is arbitrary and only the shape matters. */
const at = (hhmm: string) => new Date(`2026-09-10T${hhmm}:00Z`)
const busy = (start: string, end: string) => ({
  start: at(start),
  end: at(end),
  rawLabel: null,
})
const day = { start: at('08:00'), end: at('22:00') }

// 120 minutes with 30 either side needs a three-hour window.
const options = { durationMinutes: 120, paddingMinutes: 30, minParticipants: 2 }

describe('freeWindows', () => {
  it('returns the whole range when nothing is booked', () => {
    expect(freeWindows([], day)).toEqual([{ start: day.start, end: day.end }])
  })

  it('returns the gaps between busy blocks', () => {
    const windows = freeWindows([busy('09:00', '10:00'), busy('14:00', '15:00')], day)

    expect(windows).toEqual([
      { start: at('08:00'), end: at('09:00') },
      { start: at('10:00'), end: at('14:00') },
      { start: at('15:00'), end: at('22:00') },
    ])
  })

  it('merges overlapping blocks rather than reporting a gap between them', () => {
    const windows = freeWindows([busy('09:00', '11:00'), busy('10:00', '12:00')], day)

    expect(windows).toEqual([
      { start: at('08:00'), end: at('09:00') },
      { start: at('12:00'), end: at('22:00') },
    ])
  })

  it('handles blocks arriving out of order', () => {
    const windows = freeWindows([busy('14:00', '15:00'), busy('09:00', '10:00')], day)

    expect(windows).toEqual([
      { start: at('08:00'), end: at('09:00') },
      { start: at('10:00'), end: at('14:00') },
      { start: at('15:00'), end: at('22:00') },
    ])
  })

  it('clips blocks that start before or end after the range', () => {
    const windows = freeWindows(
      [busy('06:00', '09:00'), busy('21:00', '23:30')],
      day,
    )

    expect(windows).toEqual([{ start: at('09:00'), end: at('21:00') }])
  })

  it('returns nothing when the range is fully booked', () => {
    expect(freeWindows([busy('08:00', '22:00')], day)).toEqual([])
  })
})

describe('sharedWindows', () => {
  const raghav = (blocks: ReturnType<typeof busy>[]): Availability => ({
    userId: 'raghav',
    busy: blocks,
  })
  const jeff = (blocks: ReturnType<typeof busy>[]): Availability => ({
    userId: 'jeff',
    busy: blocks,
  })
  const edward = (blocks: ReturnType<typeof busy>[]): Availability => ({
    userId: 'edward',
    busy: blocks,
  })

  it('finds the overlap between two people', () => {
    const windows = sharedWindows(
      [raghav([busy('08:00', '17:00')]), jeff([busy('08:00', '16:00'), busy('20:00', '22:00')])],
      day,
      options,
    )

    expect(windows).toHaveLength(1)
    expect(windows[0].start).toEqual(at('17:00'))
    expect(windows[0].end).toEqual(at('20:00'))
    expect(windows[0].userIds.sort()).toEqual(['jeff', 'raghav'])
  })

  it('drops overlaps too short to hold the hangout plus its padding', () => {
    // Both free 17:00–19:00 — two hours, which a 120 minute hangout
    // with 30 either side does not fit into.
    const windows = sharedWindows(
      [
        raghav([busy('08:00', '17:00'), busy('19:00', '22:00')]),
        jeff([busy('08:00', '17:00'), busy('19:00', '22:00')]),
      ],
      day,
      options,
    )

    expect(windows).toEqual([])
  })

  it('keeps an overlap exactly long enough', () => {
    const windows = sharedWindows(
      [
        raghav([busy('08:00', '17:00'), busy('20:00', '22:00')]),
        jeff([busy('08:00', '17:00'), busy('20:00', '22:00')]),
      ],
      day,
      options,
    )

    expect(windows).toHaveLength(1)
  })

  it('returns nothing when one person is busy all day', () => {
    const windows = sharedWindows(
      [raghav([]), jeff([busy('08:00', '22:00')])],
      day,
      options,
    )

    expect(windows).toEqual([])
  })

  it('proposes to the two people who are free, not the whole group', () => {
    // Edward is out all day; Raghav and Jeff still share the evening.
    const windows = sharedWindows(
      [
        raghav([busy('08:00', '17:00')]),
        jeff([busy('08:00', '17:00')]),
        edward([busy('08:00', '22:00')]),
      ],
      day,
      options,
    )

    expect(windows).toHaveLength(1)
    expect(windows[0].userIds.sort()).toEqual(['jeff', 'raghav'])
  })

  it('names everyone free when the whole group shares a window', () => {
    const windows = sharedWindows(
      [raghav([busy('08:00', '17:00')]), jeff([busy('08:00', '17:00')]), edward([busy('08:00', '17:00')])],
      day,
      options,
    )

    expect(windows).toHaveLength(1)
    expect(windows[0].userIds.sort()).toEqual(['edward', 'jeff', 'raghav'])
  })

  it('splits into a pair window and a fuller one when someone joins partway', () => {
    // Raghav and Jeff are free from 15:00; Edward only frees up at 18:00.
    // Both stretches are worth proposing, and they are different offers —
    // the later one gets the whole group, so a caller can prefer it.
    const windows = sharedWindows(
      [
        raghav([busy('08:00', '15:00')]),
        jeff([busy('08:00', '15:00')]),
        edward([busy('08:00', '18:00')]),
      ],
      day,
      options,
    )

    expect(windows).toHaveLength(2)
    expect(windows[0]).toMatchObject({ start: at('15:00'), end: at('18:00') })
    expect(windows[0].userIds.sort()).toEqual(['jeff', 'raghav'])
    expect(windows[1]).toMatchObject({ start: at('18:00'), end: at('22:00') })
    expect(windows[1].userIds.sort()).toEqual(['edward', 'jeff', 'raghav'])
  })

  it('can be told to hold out for the whole group', () => {
    // Same availability, but nothing counts unless all three are free.
    const windows = sharedWindows(
      [
        raghav([busy('08:00', '15:00')]),
        jeff([busy('08:00', '15:00')]),
        edward([busy('08:00', '18:00')]),
      ],
      day,
      { ...options, minParticipants: 3 },
    )

    expect(windows).toHaveLength(1)
    expect(windows[0].start).toEqual(at('18:00'))
    expect(windows[0].userIds.sort()).toEqual(['edward', 'jeff', 'raghav'])
  })
})

describe('placeHangout', () => {
  it('sits the hangout inside the window, padded either side', () => {
    const placed = placeHangout(
      { start: at('17:00'), end: at('20:00'), userIds: ['raghav', 'jeff'] },
      options,
    )

    expect(placed).toEqual({ start: at('17:30'), end: at('19:30') })
  })

  it('returns null when the window cannot hold it', () => {
    const placed = placeHangout(
      { start: at('17:00'), end: at('18:00'), userIds: ['raghav', 'jeff'] },
      options,
    )

    expect(placed).toBeNull()
  })
})

describe('reconcileDuration', () => {
  it('takes the shorter preference, so both people are comfortable', () => {
    expect(reconcileDuration([120, 90])).toBe(90)
  })

  it('leaves a single preference alone', () => {
    expect(reconcileDuration([120])).toBe(120)
  })
})
