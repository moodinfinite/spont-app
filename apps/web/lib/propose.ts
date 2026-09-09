import { prisma } from '@spont/db'
import {
  placeHangout,
  reconcileDuration,
  sharedWindows,
  type Availability,
  type BusyBlock,
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

/** Hours a hangout may start within. Nobody wants a 04:00 proposal. */
const EARLIEST_HOUR = 8
const LATEST_START_HOUR = 21

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
}

/** One thing we could propose, before deciding whether to. */
type Candidate = {
  start: Date
  end: Date
  userIds: string[]
  groupId: string | null
}

/**
 * Top up this person's open proposals, and return how many were created.
 *
 * Safe to call on every feed load: it's bounded by the per-day cap, skips
 * anyone who already has something open with you, and does nothing at all
 * once you've had your allowance for the day.
 */
export async function refreshProposalsFor(userId: string): Promise<number> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, preferredHangoutMinutes: true, bufferMinutes: true, proposalsPerDay: true },
  })
  if (!me) return 0

  /**
   * The cap is on proposals that *reach you today*, not on proposals per
   * future day. "More isn't better" is about how often Spont interrupts you,
   * and two a day for the next thirty days would be sixty cards.
   */
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  const madeToday = await prisma.proposalParticipant.count({
    where: { userId, proposal: { origin: 'SUGGESTED', createdAt: { gte: since } } },
  })
  const allowance = me.proposalsPerDay - madeToday
  if (allowance <= 0) return 0

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

  const people = new Map<string, Person>([[me.id, me]])
  for (const f of friends) people.set(f.id, f)
  for (const g of groups) for (const m of g.members) people.set(m.id, m)

  const availability = await gatherAvailability([...people.keys()], range)
  // Somebody with no calendar connected can't be matched — not "always free".
  if (!availability.has(me.id)) return 0

  const candidates: Candidate[] = []

  for (const friend of friends) {
    if (busyWith.has(friend.id)) continue
    candidates.push(...windowsFor([me, friend], availability, range, 2, null))
  }

  for (const group of groups) {
    if (busyWith.has(`group:${group.id}`)) continue
    const members = group.members.filter((m) => m.id !== me.id)
    if (members.length === 0) continue
    // A group proposes as soon as any two of you are free — see the spec.
    candidates.push(...windowsFor([me, ...members], availability, range, 2, group.id))
  }

  // Soonest first: a window this week beats a better one next month.
  candidates.sort((a, b) => a.start.getTime() - b.start.getTime())

  const taken = await existingHolds(userId, range)
  const spokenFor = new Set<string>()
  let created = 0

  for (const candidate of candidates) {
    if (created >= allowance) break
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
): Candidate[] {
  const known = people.filter((p) => availability.has(p.id))
  if (known.length < minParticipants) return []

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

    out.push({ start, end, userIds: window.userIds, groupId })
    if (out.length >= WINDOWS_PER_PAIRING) break
  }

  return out
}

/** Up to the next quarter hour, so cards read as times people say out loud. */
function snap(d: Date): Date {
  const step = SNAP_MINUTES * 60_000
  return new Date(Math.ceil(d.getTime() / step) * step)
}

/** Waking hours, and not so late that the hangout is really tomorrow. */
function civilised(start: Date): boolean {
  const hour = start.getHours()
  return hour >= EARLIEST_HOUR && hour <= LATEST_START_HOUR
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

  return groups.map((g) => ({ id: g.id, members: g.members.map((m) => person(m.user)) }))
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
}): Person {
  return {
    id: u.id,
    name: u.name,
    preferredHangoutMinutes: u.preferredHangoutMinutes,
    bufferMinutes: u.bufferMinutes,
  }
}
