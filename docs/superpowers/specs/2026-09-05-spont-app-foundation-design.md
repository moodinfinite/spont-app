# Spont App — Phase 1: Foundation Design

Status: Approved for implementation planning
Date: 2026-09-05

## Product context

Spont (working name — naming is low priority) helps close friends spend more
time together spontaneously by shrinking the time it takes to figure out when
everyone's free and what the optimal hangout length/time is. It connects to
Google Calendar at the account level, buckets everyone's individual calendar
labels into a small set of universal categories, and uses those plus
free/busy data to AI-suggest hangout slots. Accepting a suggestion writes the
event back to the accepter's calendar. Self-optimization features (nudges,
a flake score) exist to increase hangout frequency, increase time spent
together, and reduce flaking.

This is too large to design and build in one pass. The system is broken into
phases, each with its own design spec, built in order:

1. **Foundation** (this document) — repo scaffold, contributor tooling
   (including a per-contributor Claude memory system), a mock calendar
   abstraction + seeded fake accounts, core data model, Friends, Groups,
   and shell pages for Notifications and Settings.
2. **Label taxonomy** — predefined universal categories, AI-suggested
   mapping from each user's real calendar labels onto them, user override,
   privacy-scoped sharing (busy blocks + category, never raw event titles).
3. **Scheduling engine** — mutual free-slot computation across a friend
   pair or group, with user-configurable, equally-weighted optimization
   signals (recency since last hangout, time-of-day/day-of-week
   preference, buffer around existing events, category balance).
4. **Accept & write-back** — per-person accept/decline on a proposed slot;
   each accepter's calendar gets the event, decliners are unaffected;
   write-back goes through the `CalendarProvider` abstraction (mock for
   now, real Google API in Phase 7).
5. **Notifications** — email + web push, wired up to the Phase 1
   notification shell.
6. **Self-optimization & flake score** — flake score (accept-then-
   cancel/no-show ratio), proactive "haven't hung out in a while" nudges,
   hangout-frequency/time-together metrics.
7. **Real Google Calendar integration** — `GoogleCalendarProvider`
   implementing the same `CalendarProvider` interface used since Phase 1;
   real OAuth, scope requests, token refresh. Deliberately last: every
   other phase is built and validated against the mock provider first, so
   Google's OAuth verification process never blocks product work.

Why defer real Google auth: standing up Google Calendar OAuth with
`calendar.events` scope requires Google's app-verification process before
it can be used by anyone beyond a short allowlist of test accounts. Building
every other phase against an interface-compatible mock first means the
whole product loop (friends, groups, categorization, scheduling, accept,
notifications, flake score) can be built, tested, and demoed without being
blocked on that review. Swapping in the real provider in Phase 7 is a
matter of implementing one interface, not restructuring the app.

## Architecture

Next.js 14 (App Router), TypeScript, in a workspace monorepo:

```
spont_app/
  apps/
    web/                    # Next.js app: UI + API routes
  packages/
    db/                     # Prisma schema + generated client
    core/                   # framework-agnostic domain logic
      calendar-provider/    # CalendarProvider interface + MockCalendarProvider
  prisma/
    seed.ts                 # seeds fake users, mock calendar accounts, events
  .claude/
    memory/
      <github-username>/
        MEMORY.md           # per-contributor index, committed
        persistent/         # committed: decisions, gotchas, context
        ephemeral/          # gitignored: scratch, in-progress task state
  docs/
    superpowers/specs/       # this file and future phase specs
  CONTRIBUTING.md
  CLAUDE.md
```

Postgres (Neon or Supabase free tier) via Prisma. Hosted on Vercel. No
NextAuth/real auth in this phase — see Auth below.

## Data model

```
User            (id, name, email, avatar, createdAt)
CalendarAccount (id, userId, provider: 'mock' | 'google', externalId, tokens?)
CalendarEvent   (id, calendarAccountId, title, start, end, rawLabel, isBusy)
Friendship      (id, userAId, userBId, status: pending|accepted, createdAt)
Group           (id, name, ownerId, createdAt)
GroupMembership (id, groupId, userId, status: invited|accepted|declined, role: owner|member)
Notification    (id, userId, type, payload, readAt, createdAt)   -- table only, unused until Phase 5
```

`CalendarAccount.provider` is the seam between mock and real data. Phase 1
only ever creates `provider: 'mock'` rows.

### CalendarProvider interface

```ts
interface CalendarProvider {
  listBusyBlocks(calendarAccountId: string, range: DateRange): Promise<BusyBlock[]>
  listRawLabels(calendarAccountId: string): Promise<string[]>
  createEvent(calendarAccountId: string, event: NewEvent): Promise<CalendarEvent>
}
```

`MockCalendarProvider` implements this against seeded `CalendarEvent` rows
in Postgres — `createEvent` just inserts a row. `GoogleCalendarProvider`
(Phase 7) implements the same interface against the real Calendar API.
Nothing in Phases 2–6 depends on which implementation is behind the
interface.

### Seed script

Creates several fake users, each with one mock `CalendarAccount` and a few
weeks of randomized `CalendarEvent`s carrying plausible fake `rawLabel`
values (e.g. "Gym", "Client Call", "Date Night"), so Phase 2's label
mapping and Phase 3's scheduling math have realistic data to run against
from day one.

## Auth (Phase 1 scope)

No real authentication yet. A dev-only screen lists seeded users; picking
one sets a signed cookie holding that user's id. All API routes read the
current user from that cookie. This is deliberately thrown away — Phase 7
replaces it with real auth (likely NextAuth + Google OAuth, reusing the
same OAuth flow that grants Calendar access).

## Friends

A directory of seeded users to send/accept/decline friend requests
(stands in for a real invite-by-email flow that arrives with real auth in
Phase 7). A `Friendship` becomes mutually visible only once both sides
have accepted.

## Groups

Groups are an independent entity, not a saved list of existing friends —
any user can create a group and invite anyone, mirroring a channel more
than a friend-group shortcut. Invitees accept/decline independently;
declining just excludes that person, with no effect on other invitees or
the group itself.

## Notifications & Settings shells

Phase 1 creates the `Notification` table and an inbox UI (empty state)
so Phase 5 only has to start inserting rows and wiring up delivery — no
schema changes needed later. Settings is a shell page with profile info
now; it becomes the home for scheduling-signal preferences (Phase 3) and
notification preferences (Phase 5).

## Contributor memory system

```
.claude/memory/<github-username>/
  MEMORY.md      # per-contributor index, committed
  persistent/    # committed: decisions, architecture notes, gotchas
  ephemeral/     # gitignored: scratch notes, in-progress task state
```

`CONTRIBUTING.md` documents the distinction: `persistent/` holds anything
that should survive across sessions and be visible to teammates (reviewed
like any other commit); `ephemeral/` is scratch space, gitignored, safe to
discard at any time. Each contributor's directory is theirs to own; there
is no cross-contributor memory in Phase 1.

## Testing & error handling

TDD workflow: Vitest + React Testing Library for units/components.
`MockCalendarProvider` always succeeds deterministically — network
failure modes are out of scope until Phase 7 introduces a real API to
fail against. API routes return a consistent error shape,
`{ error: { code, message } }`, for validation failures such as a friend
request to oneself or a duplicate group invite.

## Out of scope for this phase

Real Google OAuth/Calendar API, label taxonomy and category mapping,
scheduling/suggestion logic, accept/decline UX and write-back, actual
notification delivery, flake score, and any optimization/nudge logic.
These are Phases 2–7 above.
