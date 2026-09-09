import { prisma } from '@spont/db'
import {
  anyonePrefers,
  anyoneRefuses,
  placeHangout,
  reconcileDuration,
  sharedWindows,
  type Availability,
  type BusyBlock,
  type HangoutTimes,
} from '@spont/core'
import { busyBetween } from './availability'

/**
 * Where proposals come from.
 *
 * The matcher (packages/core/src/scheduling/free-slots.ts) and the lifecycle
 * rules (packages/core/src/proposals/rules.ts) were both written and tested
 * before anything called them. This is the piece that was missing: it reads
 * real calendars, asks the matcher where the gaps line up, and writes the
 * rows the feed renders.
 *
 * Spec: docs/superpowers/specs/2026-09-07-proposal-model-mvp.md
 */

/** How far out the matcher looks. Mirrors Settings' "How far ahead". */
const HORIZON_DAYS = 30

/**
 * Nothing lands in the next couple of hours. A proposal you can't get to is
 * worse than none — it reads as the app not knowing where you are.
 */
const LEAD_HOURS = 2

/**
 * Hours a hangout may start within: 08:00 through 02:00, wrapping past
 * midnight. The dead zone is 02:00–08:00 — a proposal at 4am isn't a late
 * night out, it's the app not knowing what time it is.
 */
const EARLIEST_HOUR = 8
const LATEST_START_HOUR = 2

/**
 * Nobody agrees to meet at 7:24. The matcher works in exact milliseconds
 * because it has to; a person reading a card does not.
 */
const SNAP_MINUTES = 15

/**
 * How many windows to keep per pairing. One is not enough: everybody's
 * earliest free window tends to be the same evening, so with one apiece the
 * second candidate always collided with the first and the day's allowance
 * went unused.
 */
const WINDOWS_PER_PAIRING = 4

type Person = {
  id: string
  name: string
  preferredHangoutMinutes: number
  bufferMinutes: number
  hangoutTimes: HangoutTimes
}

/** One thing we could propose, before deciding whether to. */
type Candidate = {
  start: Date
  end: Date
  userIds: string[]
  groupId: string | null
  /** Somebody marked this time of week as one they're up for. */
  wanted: boolean
  /** Spare minutes around the hangout inside its window — how roomy it is. */
  slackMinutes: number
}

/**
 * Top up this person's open proposals, and return how many were created.
 *
 * Safe to call on every feed load. What bounds it is one open proposal per
 * relationship: anyone you already have something open with is skipped, so a
 * second visit five minutes later creates nothing.
 *
 * There used to be a daily cap on top of that. It was removed rather than
 * left half-working, because it only ever consulted the person who opened the
 * app — four friends opening Spont could each put a proposal in front of you
 * regardless of your own number. One card per friend is a bound that means
 * the same thing from both ends.
 */
export async function refreshProposalsFor(userId: string): Promise<number> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      preferredHangoutMinutes: true,
      bufferMinutes: true,
      hangoutTimes: true,
      windowPreference: true,
    },
  })
  if (!me) return 0

  const friends = await acceptedFriends(userId)
  const groups = await groupsWithMembers(userId)
  if (friends.length === 0 && groups.length === 0) return 0

  const range = searchRange()

  /**
   * Anyone already mid-conversation with you is off the table. Offering a
   * second time to someone who hasn't answered the first is nagging, and the
   * feed would show two cards for one relationship.
   */
  const busyWith = await peopleWithSomethingOpen(userId)

  const people = new Map<string, Person>([[me.id, person(me)]])
  for (const f of friends) people.set(f.id, f)
  for (const g of groups) for (const m of g.members) people.set(m.id, m)

  const availability = await gatherAvailability([...people.keys()], range)
  // Somebody with no calendar connected can't be matched — not "always free".
  if (!availability.has(me.id)) return 0

  const candidates: Candidate[] = []

  const self = person(me)

  for (const friend of friends) {
    if (busyWith.has(friend.id)) continue
    candidates.push(...windowsFor([self, friend], availability, range, 2, null))
  }

  for (const group of groups) {
    if (busyWith.has(`group:${group.id}`)) continue
    const members = group.members.filter((m) => m.id !== me.id)
    if (members.length === 0) continue
    /**
     * How many have to be free is the group's own call, not a global rule —
     * "any two of us" suits a five-a-side, and doesn't suit a book club.
     * Never more than the group actually has.
     */
    const quorum = Math.min(group.minAttendees, members.length + 1)
    candidates.push(...windowsFor([self, ...members], availability, range, quorum, group.id))
  }

  /**
   * A time somebody said they're up for always goes first — that's the point
   * of having asked. After that it's the reader's own choice: soonest, or the
   * roomiest window, which is usually a weekend.
   *
   * Times anyone marked "never" were dropped before they got here.
   */
  const bySoonest = (a: Candidate, b: Candidate) => a.start.getTime() - b.start.getTime()

  candidates.sort((a, b) => {
    if (a.wanted !== b.wanted) return a.wanted ? -1 : 1
    if (me.windowPreference === 'BEST' && a.slackMinutes !== b.slackMinutes) {
      return b.slackMinutes - a.slackMinutes
    }
    return bySoonest(a, b)
  })

  const taken = await existingHolds(userId, range)
  const spokenFor = new Set<string>()
  let created = 0

  for (const candidate of candidates) {
    // Two proposals you'd have to be in two places for is not a choice.
    if (taken.some((t) => overlaps(t, candidate))) continue
    // One card per relationship, however many windows it had.
    const who = candidate.groupId ?? candidate.userIds.filter((id) => id !== me.id).sort().join(',')
    if (spokenFor.has(who)) continue
    spokenFor.add(who)

    await prisma.proposal.create({
      data: {
        origin: 'SUGGESTED',
        status: 'OPEN',
        startsAt: candidate.start,
        endsAt: candidate.end,
        groupId: candidate.groupId,
        participants: {
          create: candidate.userIds.map((id) => ({ userId: id, response: 'PENDING' as const })),
        },
      },
    })

    taken.push({ start: candidate.start, end: candidate.end })
    created++
  }

  return created
}

/** Now-plus-lead through the horizon. */
function searchRange(): { start: Date; end: Date } {
  const start = new Date(Date.now() + LEAD_HOURS * 60 * 60 * 1000)
  const end = new Date(start)
  end.setDate(end.getDate() + HORIZON_DAYS)
  return { start, end }
}

/**
 * The soonest few windows this set of people share that are long enough and
 * land at a civilised hour. Duration and padding are reconciled by taking the
 * shorter of everyone's preferences — the number they're all comfortable
 * with.
 */
function windowsFor(
  people: Person[],
  availability: Map<string, BusyBlock[]>,
  range: { start: Date; end: Date },
  minParticipants: number,
  groupId: string | null,
  limit: number = WINDOWS_PER_PAIRING,
): Candidate[] {
  const known = people.filter((p) => availability.has(p.id))
  if (known.length < minParticipants) return []

  const preferences = known.map((p) => p.hangoutTimes)

  const options = {
    durationMinutes: reconcileDuration(known.map((p) => p.preferredHangoutMinutes)),
    paddingMinutes: reconcileDuration(known.map((p) => p.bufferMinutes)),
    minParticipants,
  }

  const inputs: Availability[] = known.map((p) => ({
    userId: p.id,
    busy: availability.get(p.id) ?? [],
  }))

  const out: Candidate[] = []

  for (const window of sharedWindows(inputs, range, options)) {
    const placed = placeHangout(window, options)
    if (!placed) continue

    // Snapping can push the hangout past the end of its own window, so the
    // fit has to be rechecked rather than assumed from placeHangout.
    const start = snap(placed.start)
    const end = new Date(start.getTime() + options.durationMinutes * 60_000)
    if (end.getTime() + options.paddingMinutes * 60_000 > window.end.getTime()) continue
    if (!civilised(start)) continue
    // One person's "never" is enough. Proposing a time somebody explicitly
    // ruled out is worse than proposing nothing.
    if (anyoneRefuses(preferences, start)) continue

    const needed = (options.durationMinutes + options.paddingMinutes * 2) * 60_000
    out.push({
      start,
      end,
      userIds: window.userIds,
      groupId,
      wanted: anyonePrefers(preferences, start),
      slackMinutes: Math.round(
        (window.end.getTime() - window.start.getTime() - needed) / 60_000,
      ),
    })
    if (out.length >= limit) break
  }

  return out
}

/** Up to the next quarter hour, so cards read as times people say out loud. */
function snap(d: Date): Date {
  const step = SNAP_MINUTES * 60_000
  return new Date(Math.ceil(d.getTime() / step) * step)
}

/**
 * The range wraps midnight, so this is an OR rather than the usual AND: 1am
 * is inside it, 7am is not.
 */
function civilised(start: Date): boolean {
  const hour = start.getHours()
  return hour >= EARLIEST_HOUR || hour < LATEST_START_HOUR
}

async function gatherAvailability(
  userIds: string[],
  range: { start: Date; end: Date },
): Promise<Map<string, BusyBlock[]>> {
  const accounts = await prisma.calendarAccount.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, provider: true, userId: true },
  })

  const out = new Map<string, BusyBlock[]>()
  for (const account of accounts) {
    try {
      const busy = await busyBetween(account, range.start, range.end)
      // null means the provider wouldn't answer — an expired refresh token,
      // say. Leaving them out is right: we don't know they're free.
      if (busy !== null) out.set(account.userId, busy)
    } catch (error) {
      console.error(`Could not read the calendar for ${account.userId}`, error)
    }
  }
  return out
}

async function acceptedFriends(userId: string): Promise<Person[]> {
  const friendships = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ userAId: userId }, { userBId: userId }] },
    include: { userA: true, userB: true },
  })
  return friendships.map((f) => person(f.userAId === userId ? f.userB : f.userA))
}

async function groupsWithMembers(userId: string) {
  const mine = await prisma.groupMembership.findMany({
    where: { userId, status: 'ACCEPTED' },
    select: { groupId: true },
  })
  if (mine.length === 0) return []

  const groups = await prisma.group.findMany({
    where: { id: { in: mine.map((m) => m.groupId) } },
    include: { members: { where: { status: 'ACCEPTED' }, include: { user: true } } },
  })

  return groups.map((g) => ({
    id: g.id,
    minAttendees: g.minAttendees,
    members: g.members.map((m) => person(m.user)),
  }))
}

/**
 * Who you already have something open with — by user id for a 1:1, and by
 * `group:<id>` for a group, since a group's second proposal is as much of a
 * nag as a person's.
 */
async function peopleWithSomethingOpen(userId: string): Promise<Set<string>> {
  const open = await prisma.proposal.findMany({
    where: {
      status: { in: ['OPEN', 'CONFIRMED'] },
      startsAt: { gt: new Date() },
      participants: { some: { userId } },
    },
    include: { participants: true },
  })

  const out = new Set<string>()
  for (const p of open) {
    if (p.groupId) out.add(`group:${p.groupId}`)
    for (const participant of p.participants) {
      if (participant.userId !== userId) out.add(participant.userId)
    }
  }
  return out
}

/** Times already spoken for, so a new proposal doesn't double-book you. */
async function existingHolds(userId: string, range: { start: Date; end: Date }) {
  const held = await prisma.proposal.findMany({
    where: {
      status: { in: ['OPEN', 'CONFIRMED'] },
      startsAt: { lt: range.end },
      endsAt: { gt: range.start },
      participants: { some: { userId } },
    },
    select: { startsAt: true, endsAt: true },
  })
  return held.map((p) => ({ start: p.startsAt, end: p.endsAt }))
}

function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
  return a.start < b.end && b.start < a.end
}

function person(u: {
  id: string
  name: string
  preferredHangoutMinutes: number
  bufferMinutes: number
  hangoutTimes: unknown
}): Person {
  return {
    id: u.id,
    name: u.name,
    preferredHangoutMinutes: u.preferredHangoutMinutes,
    bufferMinutes: u.bufferMinutes,
    // Prisma types this as Json, and an unset column comes back null.
    hangoutTimes: (u.hangoutTimes ?? {}) as HangoutTimes,
  }
}

/**
 * Times a chosen set of people could actually make.
 *
 * The matcher's other entry point decides *who* to propose to; here the
 * person has already decided that, so this only answers *when*. Everyone
 * picked has to be free — you named these people, so a window three of the
 * four can make isn't an answer to the question you asked.
 *
 * At most one window per day. The matcher's raw output clusters: the same
 * Thursday evening yields 6:00, 6:15 and 6:30, which is three slots and no
 * choice. A day apiece makes the options actually different from each other.
 *
 * Ordering follows the same rules as the feed — a time someone said they're
 * up for first, then the reader's own soonest-or-roomiest preference.
 */
export async function windowsWith(
  userId: string,
  withUserIds: string[],
  limit = 3,
): Promise<{ start: Date; end: Date; wanted: boolean }[]> {
  const ids = [...new Set([userId, ...withUserIds])]
  if (ids.length < 2) return []

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      preferredHangoutMinutes: true,
      bufferMinutes: true,
      hangoutTimes: true,
      windowPreference: true,
    },
  })
  const me = users.find((u) => u.id === userId)
  // Somebody asking about people who don't exist gets nothing, not a crash.
  if (!me || users.length !== ids.length) return []

  const range = searchRange()
  const availability = await gatherAvailability(ids, range)
  if (!availability.has(userId)) return []

  // Ask for a generous number, because the one-per-day pass below throws
  // most of them away.
  const candidates = windowsFor(users.map(person), availability, range, ids.length, null, 40)

  candidates.sort((a, b) => {
    if (a.wanted !== b.wanted) return a.wanted ? -1 : 1
    if (me.windowPreference === 'BEST' && a.slackMinutes !== b.slackMinutes) {
      return b.slackMinutes - a.slackMinutes
    }
    return a.start.getTime() - b.start.getTime()
  })

  // Not on top of something you've already said yes to.
  const taken = await existingHolds(userId, range)

  const out: { start: Date; end: Date; wanted: boolean }[] = []
  const daysUsed = new Set<string>()

  for (const candidate of candidates) {
    if (taken.some((t) => overlaps(t, candidate))) continue
    const day = `${candidate.start.getFullYear()}-${candidate.start.getMonth()}-${candidate.start.getDate()}`
    if (daysUsed.has(day)) continue
    daysUsed.add(day)
    out.push({ start: candidate.start, end: candidate.end, wanted: candidate.wanted })
    if (out.length >= limit) break
  }

  return out
}
