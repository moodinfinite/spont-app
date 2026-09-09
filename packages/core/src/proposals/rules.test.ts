import { describe, expect, it } from 'vitest'
import {
  canStillReachQuorum,
  eventsToRemoveAfterWithdrawal,
  hasQuorum,
  quorumFor,
  respond,
  shouldHoldEvent,
  statusOf,
  viewFor,
  withdraw,
  type Participant,
  type ProposalState,
} from './rules'

const THURSDAY = new Date('2026-09-10T18:00:00Z')
const BEFORE = new Date('2026-09-09T12:00:00Z')
const AFTER = new Date('2026-09-10T20:00:00Z')

const p = (userId: string, response: Participant['response'] = 'PENDING'): Participant => ({
  userId,
  response,
})

const oneToOne = (participants: Participant[]): ProposalState => ({
  participants,
  isGroup: false,
  startsAt: THURSDAY,
})

const group = (participants: Participant[]): ProposalState => ({
  participants,
  isGroup: true,
  startsAt: THURSDAY,
})

describe('quorum', () => {
  it('a 1:1 needs everyone', () => {
    expect(quorumFor(oneToOne([p('raghav'), p('jeff')]))).toBe(2)
  })

  it('a group needs two, however many are invited', () => {
    expect(quorumFor(group([p('raghav'), p('jeff'), p('edward'), p('rod')]))).toBe(2)
  })

  it('is not reached while someone is still thinking', () => {
    expect(hasQuorum(oneToOne([p('raghav', 'ACCEPTED'), p('jeff')]))).toBe(false)
  })

  it('is reached when a group hits two yeses, even with others pending', () => {
    expect(
      hasQuorum(group([p('raghav', 'ACCEPTED'), p('jeff', 'ACCEPTED'), p('edward')])),
    ).toBe(true)
  })
})

describe('statusOf', () => {
  it('is open while people are still deciding', () => {
    expect(statusOf(oneToOne([p('raghav'), p('jeff')]), BEFORE)).toBe('OPEN')
  })

  it('confirms a 1:1 only once both have said yes', () => {
    const half = oneToOne([p('raghav', 'ACCEPTED'), p('jeff')])
    expect(statusOf(half, BEFORE)).toBe('OPEN')

    const both = oneToOne([p('raghav', 'ACCEPTED'), p('jeff', 'ACCEPTED')])
    expect(statusOf(both, BEFORE)).toBe('CONFIRMED')
  })

  it('cancels a 1:1 the moment one person declines', () => {
    const state = oneToOne([p('raghav', 'ACCEPTED'), p('jeff', 'DECLINED')])
    expect(statusOf(state, BEFORE)).toBe('CANCELLED')
  })

  it('confirms a group on two yeses and ignores a decline', () => {
    const state = group([
      p('raghav', 'ACCEPTED'),
      p('jeff', 'ACCEPTED'),
      p('edward', 'DECLINED'),
      p('rod'),
    ])
    expect(statusOf(state, BEFORE)).toBe('CONFIRMED')
  })

  it('cancels a group once too few people are left to reach two', () => {
    const state = group([
      p('raghav', 'ACCEPTED'),
      p('jeff', 'DECLINED'),
      p('edward', 'DECLINED'),
    ])
    expect(canStillReachQuorum(state)).toBe(false)
    expect(statusOf(state, BEFORE)).toBe('CANCELLED')
  })

  it('expires silently when the time passes with nobody committed', () => {
    const state = oneToOne([p('raghav'), p('jeff')])
    expect(statusOf(state, AFTER)).toBe('EXPIRED')
  })

  it('stays confirmed after the start time — it happened', () => {
    const state = oneToOne([p('raghav', 'ACCEPTED'), p('jeff', 'ACCEPTED')])
    expect(statusOf(state, AFTER)).toBe('CONFIRMED')
  })

  it('a lone accept expires rather than confirming', () => {
    // The bug this whole rule exists to prevent: Raghav said yes, Jeff never
    // answered, and Raghav must not be left thinking it is happening.
    const state = oneToOne([p('raghav', 'ACCEPTED'), p('jeff')])
    expect(statusOf(state, AFTER)).toBe('EXPIRED')
  })
})

describe('shouldHoldEvent', () => {
  it('writes nothing to a 1:1 accepter until the other says yes', () => {
    const half = oneToOne([p('raghav', 'ACCEPTED'), p('jeff')])
    expect(shouldHoldEvent(half, 'raghav', BEFORE)).toBe(false)
  })

  it('writes to both once a 1:1 is confirmed', () => {
    const both = oneToOne([p('raghav', 'ACCEPTED'), p('jeff', 'ACCEPTED')])
    expect(shouldHoldEvent(both, 'raghav', BEFORE)).toBe(true)
    expect(shouldHoldEvent(both, 'jeff', BEFORE)).toBe(true)
  })

  it('writes only to the people who said yes in a group', () => {
    const state = group([
      p('raghav', 'ACCEPTED'),
      p('jeff', 'ACCEPTED'),
      p('edward', 'DECLINED'),
      p('rod'),
    ])
    expect(shouldHoldEvent(state, 'raghav', BEFORE)).toBe(true)
    expect(shouldHoldEvent(state, 'edward', BEFORE)).toBe(false)
    expect(shouldHoldEvent(state, 'rod', BEFORE)).toBe(false)
  })
})

describe('viewFor', () => {
  it('asks the person who has not answered', () => {
    const state = oneToOne([p('raghav'), p('jeff')])
    expect(viewFor(state, 'raghav', BEFORE)).toBe('AWAITING_YOU')
  })

  it('tells a 1:1 accepter they are waiting on the other person', () => {
    const state = oneToOne([p('raghav', 'ACCEPTED'), p('jeff')])
    expect(viewFor(state, 'raghav', BEFORE)).toBe('WAITING_ON_OTHERS')
  })

  it('confirms once both are in', () => {
    const state = oneToOne([p('raghav', 'ACCEPTED'), p('jeff', 'ACCEPTED')])
    expect(viewFor(state, 'raghav', BEFORE)).toBe('CONFIRMED_FOR_YOU')
  })

  it('confirms a group accepter even while others are undecided', () => {
    const state = group([p('raghav', 'ACCEPTED'), p('jeff', 'ACCEPTED'), p('edward')])
    expect(viewFor(state, 'raghav', BEFORE)).toBe('CONFIRMED_FOR_YOU')
    expect(viewFor(state, 'edward', BEFORE)).toBe('AWAITING_YOU')
  })

  it('tells the accepter when it fell through', () => {
    const state = oneToOne([p('raghav', 'ACCEPTED'), p('jeff', 'DECLINED')])
    expect(viewFor(state, 'raghav', BEFORE)).toBe('FELL_THROUGH')
  })

  it('shows your own decline as yours, not as a collapse', () => {
    const state = oneToOne([p('raghav', 'DECLINED'), p('jeff')])
    expect(viewFor(state, 'raghav', BEFORE)).toBe('YOU_DECLINED')
  })

  it('refuses to answer for someone who is not on the proposal', () => {
    const state = oneToOne([p('raghav'), p('jeff')])
    expect(() => viewFor(state, 'ming', BEFORE)).toThrow(/not on this proposal/)
  })
})

describe('respond and withdraw', () => {
  it('records an answer without touching anyone else', () => {
    const after = respond([p('raghav'), p('jeff')], 'raghav', 'ACCEPTED')
    expect(after).toEqual([p('raghav', 'ACCEPTED'), p('jeff')])
  })

  it('refuses an answer from someone not invited', () => {
    expect(() => respond([p('raghav')], 'ming', 'ACCEPTED')).toThrow(/not on this proposal/)
  })

  it('withdrawing reads as a decline to everyone else', () => {
    const after = withdraw([p('raghav', 'ACCEPTED'), p('jeff', 'ACCEPTED')], 'raghav')
    expect(after).toEqual([p('raghav', 'DECLINED'), p('jeff', 'ACCEPTED')])
  })

  it('refuses to withdraw from something never accepted', () => {
    expect(() => withdraw([p('raghav'), p('jeff')], 'raghav')).toThrow(/nothing to withdraw/)
  })
})

describe('eventsToRemoveAfterWithdrawal', () => {
  it('takes the event off both calendars when a 1:1 collapses', () => {
    const state = oneToOne([p('raghav', 'ACCEPTED'), p('jeff', 'ACCEPTED')])
    expect(eventsToRemoveAfterWithdrawal(state, 'raghav', BEFORE).sort()).toEqual([
      'jeff',
      'raghav',
    ])
  })

  it('leaves the rest of a group alone when it still has quorum', () => {
    const state = group([
      p('raghav', 'ACCEPTED'),
      p('jeff', 'ACCEPTED'),
      p('edward', 'ACCEPTED'),
    ])
    expect(eventsToRemoveAfterWithdrawal(state, 'raghav', BEFORE)).toEqual(['raghav'])
  })

  it('clears everyone when a group drops below quorum', () => {
    const state = group([p('raghav', 'ACCEPTED'), p('jeff', 'ACCEPTED'), p('edward', 'DECLINED')])
    expect(eventsToRemoveAfterWithdrawal(state, 'raghav', BEFORE).sort()).toEqual([
      'jeff',
      'raghav',
    ])
  })
})
