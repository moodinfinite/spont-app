# Proposal model — MVP spec

The spine the whole app hangs off, and the first real code after Phase 1.
Scoped deliberately smaller than the phase plan: this exists to answer
one question — **does Spont actually get friends together?** — with a
handful of real testers on real calendars.

Decisions below were made 2026-09-07. Where this contradicts
`2026-09-05-spont-app-foundation-design.md`, this document wins for the
MVP and the foundation spec should be amended once the test reports back.

## What a Proposal is

A proposed hangout between two or more people at a specific time. Every
screen in the current mockups is a view of this one thing:

- the feed is *proposals I haven't answered*
- Upcoming is *proposals I accepted*
- "Can't make it" flips my answer back and hands the slot to the others

## Shape

```
Proposal
  id
  origin          SUGGESTED | INVITED      -- engine vs a person
  startsAt        DateTime
  endsAt          DateTime
  status          OPEN | CONFIRMED | CANCELLED | EXPIRED
  groupId         nullable                 -- set when it came from a group
  createdById     nullable                 -- set when a person proposed it
  createdAt

ProposalParticipant
  id
  proposalId
  userId
  response        PENDING | ACCEPTED | DECLINED
  respondedAt     nullable
  calendarEventId nullable                 -- set once written to their calendar
```

Per-participant response is the load-bearing part. It's what lets Jeff be
in while Edward hasn't answered, and it's the only honest place to record
who actually committed.

**User gains two preference fields** (both set in onboarding, correctable
in Settings): preferred hangout length, and buffer either side.
Hangout-time buckets come later — the matcher does not read them in v1.

## Rules

**Duration is a personal setting, reconciled by taking the shorter.**
Default 120 minutes. If Raghav prefers 120 and Jeff prefers 90, propose
90 — the shorter number is the one both people are comfortable with.
Cards never display a duration; they show start and end time, and the
length is implied.

**Padding is 30 minutes either side** for the MVP, from the same
reconcile-by-shorter rule once it's user-set. A gap must fit
`duration + padding + padding` to count.

**Groups need any two people free, not everyone.** Four busy people
rarely share a window; two often do. The proposal names who it's actually
free for. All-or-nothing would return nothing and read as a broken app.

**1:1 needs both yeses; groups accept independently.** This is a
deliberate departure from the foundation spec's blanket "instant and
independent" rule. For two people, independent acceptance is incoherent —
if you accept and they decline, you're left holding a calendar event for
a hangout that isn't happening, and nobody told you. So:

- **1:1** — your accept is a commitment pending theirs. Nothing is
  written to either calendar until both have said yes; then both get it.
- **Group** — each accept writes to that person's calendar immediately.
  Three out of five showing up is a real outcome, so independence holds.

**No cooldown after a decline.** Declining Thursday doesn't stop Spont
offering Saturday. Revisit if testers find it naggy; the one-per-day cap
is the existing guard.

**Proposals expire silently at their start time** and count against
nobody. Not answering is not flaking.

## Matcher, v1

Deliberately dumb. Not the Phase 3 weighted-signal engine.

1. Pull busy blocks for each participant over the next 30 days.
2. Invert to free blocks, per person.
3. Intersect across participants (all for a 1:1; any pair or more for a
   group).
4. Drop any window shorter than `duration + 2 × padding`.
5. Cap at the configured proposals per day (currently two).

No weighting, no recency, no category balance. Those are Phase 3 and
none of them are needed to find out whether overlap exists at all.

## Explicitly out of scope for the MVP

Label taxonomy, weighted scheduling signals, tiers, seasons, mastery,
hours-together, photos, push notifications. Each adds a way for the test
to fail for reasons that aren't the premise.

## Calendars: real, not mock

Building against the real Google provider first, not the mock. The
`CalendarProvider` interface already exists and the mock already
implements it, so this is one new class rather than a restructure.

The foundation spec defers Google to Phase 7 because verification is
needed "beyond a short allowlist of test accounts" — a friends test *is*
that allowlist, so verification is likely not a blocker. **Confirm this
before building far**, including how long refresh tokens survive for
unverified apps, since a test running over weeks is affected by it.

Credentials live in a local `.env` only. Nothing real — addresses,
client IDs, secrets — belongs in this repo or its seed data.

## Open

- **Does a late cancel cost you tier?** Still the biggest unanswered
  question in the reliability model. Not needed for the MVP, since tiers
  are out of scope for the test, but it will be.
- **How does a group proposal's card look as answers land?** Jeff in,
  Edward out, Rod silent — undesigned. The model supports it; the UI
  doesn't show it yet.
- **Notifications.** A proposal nobody sees didn't happen, and the whole
  promise is that you're not in the app. Email is the cheapest path.
