import { describe, expect, it } from 'vitest'
import { anyonePrefers, anyoneRefuses, bucketFor } from './hangout-times'

// 2026-09-09 is a Wednesday; 2026-09-12 is a Saturday.
const weekday = (hour: number, minute = 0) => new Date(2026, 8, 9, hour, minute)
const weekend = (hour: number, minute = 0) => new Date(2026, 8, 12, hour, minute)

describe('hangout time buckets', () => {
  it('reads weekday hours as weekday buckets', () => {
    expect(bucketFor(weekday(7))).toBe('wd-before')
    expect(bucketFor(weekday(12, 30))).toBe('wd-lunch')
    expect(bucketFor(weekday(18))).toBe('wd-after')
    expect(bucketFor(weekday(20))).toBe('wd-evening')
    expect(bucketFor(weekday(23))).toBe('wd-late')
  })

  it('reads the same hours differently at the weekend', () => {
    expect(bucketFor(weekend(12, 30))).toBe('we-midday')
    expect(bucketFor(weekend(20))).toBe('we-evening')
  })

  it('leaves hours nobody was asked about unbucketed', () => {
    // Weekday mid-afternoon sits between "lunch" and "straight after work".
    expect(bucketFor(weekday(15))).toBeNull()
  })

  it('treats a bucket boundary as the start of the later bucket', () => {
    expect(bucketFor(weekday(19))).toBe('wd-evening')
    expect(bucketFor(weekday(18, 59))).toBe('wd-after')
  })

  it('lets one person veto a time for everyone', () => {
    const keen = { 'wd-lunch': 'yes' } as const
    const not = { 'wd-lunch': 'never' } as const
    expect(anyoneRefuses([keen, not], weekday(12, 30))).toBe(true)
    expect(anyoneRefuses([keen, keen], weekday(12, 30))).toBe(false)
  })

  it('does not refuse a time nobody was asked about', () => {
    expect(anyoneRefuses([{ 'wd-lunch': 'never' }], weekday(15))).toBe(false)
  })

  it('spots a time somebody actively wants', () => {
    expect(anyonePrefers([{}, { 'we-morning': 'yes' }], weekend(9))).toBe(true)
    expect(anyonePrefers([{}, {}], weekend(9))).toBe(false)
  })

  it('reads an absent preference as no preference, not as a no', () => {
    expect(anyoneRefuses([{}], weekday(20))).toBe(false)
    expect(anyonePrefers([{}], weekday(20))).toBe(false)
  })
})
