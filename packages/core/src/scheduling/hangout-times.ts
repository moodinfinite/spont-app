/**
 * What the hangout-time buckets mean in hours.
 *
 * Settings has collected these since the day it was built and nothing ever
 * read them, which meant nobody had to say what "lunch" actually is. Putting
 * a number on each one is a product decision, so it lives here in the open
 * rather than buried in the matcher.
 *
 * Weekdays and weekends are asked separately because they aren't the same
 * question — weekday time is carved up by work, weekend time by daylight.
 */

export type Appetite = 'yes' | 'never'

/** Shaped { "wd-evening": "yes", ... }. An absent key means no preference. */
export type HangoutTimes = Record<string, Appetite>

type Bucket = { key: string; from: number; to: number }

/**
 * Ranges are deliberately not exhaustive. A weekday 3pm belongs to no bucket,
 * and that's the honest answer — nobody was asked about it, so it counts as
 * no preference rather than as a hidden yes or no.
 */
const WEEKDAY: Bucket[] = [
  { key: 'wd-before', from: 6, to: 9 },
  { key: 'wd-lunch', from: 11, to: 14 },
  { key: 'wd-after', from: 17, to: 19 },
  { key: 'wd-evening', from: 19, to: 22 },
  { key: 'wd-late', from: 22, to: 24 },
]

const WEEKEND: Bucket[] = [
  { key: 'we-morning', from: 8, to: 11 },
  { key: 'we-midday', from: 11, to: 14 },
  { key: 'we-afternoon', from: 14, to: 17 },
  { key: 'we-evening', from: 17, to: 21 },
  { key: 'we-late', from: 21, to: 24 },
]

/** Which bucket a moment falls in, or null when nobody was asked about it. */
export function bucketFor(when: Date): string | null {
  const day = when.getDay()
  const isWeekend = day === 0 || day === 6
  const hour = when.getHours() + when.getMinutes() / 60

  for (const bucket of isWeekend ? WEEKEND : WEEKDAY) {
    if (hour >= bucket.from && hour < bucket.to) return bucket.key
  }
  return null
}

/**
 * Somebody said never to this time of week.
 *
 * A veto, not a vote: one person's "never" is enough, because the alternative
 * is proposing a time you were explicitly told not to.
 */
export function anyoneRefuses(preferences: HangoutTimes[], when: Date): boolean {
  const bucket = bucketFor(when)
  if (!bucket) return false
  return preferences.some((p) => p[bucket] === 'never')
}

/**
 * Somebody actively wants this time of week, and nobody refuses it. Used to
 * sort a wanted window ahead of one nobody expressed a view on.
 */
export function anyonePrefers(preferences: HangoutTimes[], when: Date): boolean {
  const bucket = bucketFor(when)
  if (!bucket) return false
  return preferences.some((p) => p[bucket] === 'yes')
}
