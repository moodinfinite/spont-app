/**
 * The rules a proposal lives by.
 *
 * Kept as pure functions on purpose: this is the trickiest thing the product
 * decided, and it should be provable without a database in the way.
 *
 * The rule that drives everything here — a 1:1 needs both yeses, a group only
 * needs two — comes from a plain observation: a hangout with one person isn't
 * a hangout. Accepting a 1:1 is "yes, if they are". Accepting a group plan is
 * a commitment on its own, because three out of five turning up is a real
 * evening. See docs/superpowers/specs/2026-09-07-proposal-model-mvp.md.
 */

export type Response = 'PENDING' | 'ACCEPTED' | 'DECLINED'

export type ProposalStatus = 'OPEN' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED'

export interface Participant {
  userId: string
  response: Response
}

export interface ProposalState {
  participants: Participant[]
  /** A group proposal, even if only two people are on it. */
  isGroup: boolean
  startsAt: Date
}

/** A group hangout is on once this many people have said yes. */
export const GROUP_QUORUM = 2

const accepted = (p: Participant[]) => p.filter((x) => x.response === 'ACCEPTED')
const declined = (p: Participant[]) => p.filter((x) => x.response === 'DECLINED')

/** How many yeses this proposal needs before it's actually happening. */
export function quorumFor(state: Pick<ProposalState, 'participants' | 'isGroup'>): number {
  return state.isGroup ? GROUP_QUORUM : state.participants.length
}

/** Enough people have said yes that the hangout is real. */
export function hasQuorum(state: Pick<ProposalState, 'participants' | 'isGroup'>): boolean {
  return accepted(state.participants).length >= quorumFor(state)
}

/**
 * Whether enough people *could* still say yes. A 1:1 dies on the first
 * decline; a group dies once too few people are left to reach quorum.
 */
export function canStillReachQuorum(
  state: Pick<ProposalState, 'participants' | 'isGroup'>,
): boolean {
  const stillPossible = state.participants.length - declined(state.participants).length
  return stillPossible >= quorumFor(state)
}

/**
 * The proposal's status right now. `now` is passed in rather than read from
 * the clock so this stays a pure function and testable at any moment.
 */
export function statusOf(state: ProposalState, now: Date): ProposalStatus {
  if (!canStillReachQuorum(state)) return 'CANCELLED'
  if (hasQuorum(state)) return 'CONFIRMED'
  // Nobody killed it and nobody committed — it just ran out of time.
  if (now >= state.startsAt) return 'EXPIRED'
  return 'OPEN'
}

/**
 * Whether this person's calendar should hold the event.
 *
 * Only people who said yes, and only once the proposal is actually happening.
 * This is what stops a 1:1 accepter being left holding an event for a hangout
 * the other person declined.
 */
export function shouldHoldEvent(
  state: ProposalState,
  userId: string,
  now: Date,
): boolean {
  if (statusOf(state, now) !== 'CONFIRMED') return false
  return accepted(state.participants).some((p) => p.userId === userId)
}

/**
 * What one participant should be told their answer means, given where the
 * proposal has got to. The UI copy hangs off this — a 1:1 accept before the
 * other person answers is a promise, not a plan.
 */
export type ParticipantView =
  | 'AWAITING_YOU'
  | 'WAITING_ON_OTHERS'
  | 'CONFIRMED_FOR_YOU'
  | 'YOU_DECLINED'
  | 'FELL_THROUGH'
  | 'EXPIRED'

export function viewFor(state: ProposalState, userId: string, now: Date): ParticipantView {
  const mine = state.participants.find((p) => p.userId === userId)
  if (!mine) throw new Error(`User ${userId} is not on this proposal`)

  const status = statusOf(state, now)

  if (mine.response === 'DECLINED') return 'YOU_DECLINED'
  if (status === 'CANCELLED') return 'FELL_THROUGH'
  if (status === 'EXPIRED') return 'EXPIRED'
  if (status === 'CONFIRMED' && mine.response === 'ACCEPTED') return 'CONFIRMED_FOR_YOU'
  if (mine.response === 'ACCEPTED') return 'WAITING_ON_OTHERS'
  return 'AWAITING_YOU'
}

/**
 * Applying an answer. Returns the participants as they'd be afterwards —
 * the caller decides whether to persist it.
 */
export function respond(
  participants: Participant[],
  userId: string,
  response: Exclude<Response, 'PENDING'>,
  ): Participant[] {
  if (!participants.some((p) => p.userId === userId)) {
    throw new Error(`User ${userId} is not on this proposal`)
  }
  return participants.map((p) => (p.userId === userId ? { ...p, response } : p))
}

/**
 * Backing out after having accepted — the "Can't make it" path.
 *
 * Deliberately the same shape as a decline, because to everyone else it is
 * one. What separates a cancel from an undo is time, and that lives in the
 * caller: inside the undo window nothing has been written or announced yet.
 */
export function withdraw(participants: Participant[], userId: string): Participant[] {
  const mine = participants.find((p) => p.userId === userId)
  if (!mine) throw new Error(`User ${userId} is not on this proposal`)
  if (mine.response !== 'ACCEPTED') {
    throw new Error(`User ${userId} has not accepted, so there is nothing to withdraw`)
  }
  return respond(participants, userId, 'DECLINED')
}

/**
 * Who loses their calendar event when `userId` backs out.
 *
 * A 1:1 collapses: the other person's event has to go too, because there's no
 * longer a hangout. A group that still has quorum carries on untouched — the
 * point of independent acceptance.
 */
export function eventsToRemoveAfterWithdrawal(
  state: ProposalState,
  userId: string,
  now: Date,
): string[] {
  const wasHolding = state.participants
    .filter((p) => shouldHoldEvent(state, p.userId, now))
    .map((p) => p.userId)

  const after: ProposalState = {
    ...state,
    participants: withdraw(state.participants, userId),
  }

  return wasHolding.filter((id) => !shouldHoldEvent(after, id, now))
}
