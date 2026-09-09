# Where the design stands — updated 2026-09-08 (end of day)

A snapshot for whoever picks this up next (Raghav asked for this
specifically). Companion to [[home-feed-visual-direction]],
[[reliability-ranking-direction]] and [[onboarding-flow-and-voice]],
which hold the reasoning; this holds the state.
[[shipping-and-infrastructure]] covers the database, hosting and Google.

## It's a real app now

**Live at <https://spontapp.vercel.app>**, on a real Postgres, with
Google sign-in. Signing up *is* connecting your calendar — no password,
no separate account step.

Built into the app, not just designed:

| Screen | Route | State |
| --- | --- | --- |
| Welcome | `/welcome` | The mission screen, full-bleed accent green |
| Setup | `/connected` | Calendar → hangout times → invite, in that order |
| Feed | `/` | Renders the waiting state, because no proposals exist yet |
| People | `/friends` | Friends and Groups tabs, add and accept |
| Settings | `/settings` | A dock stop now. Times, length, buffer, per-day cap, appearance, your profile — all save on tap |
| Create | `/new` | Step one only; picking a person is real, sending isn't |
| Invite | `/join/[code]` | Carries the inviter's name; works signed in or out |

The design system is ported into `apps/web/app/globals.css` — the same
four colour roles, 16px surfaces, both themes plus a toggle.

**Notifications are gone entirely** — page, API, bell, and the
`Notification` table and its relation too. The bell had outlived the
feature by a while, still linking to a page that 404'd. What replaced it
is a dot on a dock tab and nothing else.

## Code that exists behind it

- `packages/core/src/scheduling/free-slots.ts` — the matcher. Inverts
  busy blocks into gaps, intersects across people, drops anything too
  short. 18 tests.
- `packages/core/src/proposals/rules.ts` — the lifecycle. A 1:1 needs
  every yes, a group needs its quorum; nobody holds a calendar event for
  a hangout that isn't happening. 29 tests.
- `packages/core/src/scheduling/hangout-times.ts` — what the appetite
  buckets mean in hours, and whether anyone has vetoed a time. 8 tests.
- `apps/web/lib/propose.ts` — the piece that calls all of the above and
  writes rows. Not in core, because it touches calendars and the database.
- `apps/web/lib/google-calendar.ts` — reads real availability from
  Google, refreshing the access token when it's stale.
- `Proposal` and `ProposalParticipant` exist as tables.

**Proposals exist.** `apps/web/lib/propose.ts` reads calendars, asks the
matcher where gaps line up, and writes the rows. The feed renders them as
the inverted "suggested" card, accepting runs the five-second undo window,
and accepted ones fall through to Upcoming — where a 1:1 correctly reads
"Waiting on Jeff" rather than claiming it's confirmed.

**How a time actually gets chosen**, in order. Worth reading before
changing any of it, because most of these were decisions rather than
mechanics:

1. Busy blocks per person over the next 30 days, inverted into free
   windows and intersected. Anyone whose calendar won't answer is left
   out rather than assumed free.
2. Anything shorter than the hangout **plus padding either side** is
   dropped. This is the counter-intuitive one: with a 2h hangout and 30m
   buffer you need a clear 3h, so two people genuinely both free for an
   hour at lunch produces nothing.
3. Times anyone marked **"never"** are dropped — one person's veto is
   enough. Checked against the *start*, not the whole span, because a 2h
   hangout straddles two buckets more often than not and testing the span
   vetoes almost everything.
4. Nothing inside 2 hours; nothing starting outside **08:00–02:00** (the
   range wraps midnight, so the check is an OR, not the usual AND);
   snapped up to the next quarter hour.
5. Up to 4 windows are kept per pairing, not one — everyone's earliest
   free window is the same evening, so one apiece meant every candidate
   after the first collided.
6. Sorted: a time someone marked **"up for it"** always first, then either
   soonest or roomiest, which is the reader's own setting.
7. One card per relationship, and nothing that double-books you.

**There is no daily cap.** There was, and it was removed on 2026-09-08
rather than fixed: it only consulted the person who opened the app, so
four friends opening Spont could each put a proposal in front of you
whatever your own number said. One open proposal per relationship is the
bound now — it means the same thing from both ends and needs no setting.
`User.proposalsPerDay` survives as a parked column that nothing reads.

**Group quorum is per-group**, set by any accepted member on the group
screen, capped at however many have accepted. Two is still the default,
but "any two of us" suits five-a-side and not a book club, and only the
group knows which it is.

**Generation runs on feed load, not on a cron.** There's no scheduler in
this deployment. It's bounded by one-per-relationship so most visits
create nothing, but it wants to be a morning job before this has more
users than a friends test. One consequence: the layout computes the dock
dots in parallel with the feed, so on the render that creates a proposal
the Home dot trails by one navigation.

**Nothing is written to anyone's Google Calendar yet.**
`calendarEventId` stays null. The five-second undo window on accept is
exactly where that write belongs.

## Screens that exist as mockups

All in `docs/superpowers/mockups/`, all self-contained HTML — open them
in a browser, no build step. Each supports light and dark with a toggle.

| Screen | File | State |
| --- | --- | --- |
| Home feed | `2026-09-06-home-feed-mockup-v2-rounded.html` | Interactive: filters, accept with undo, decline, cancel from Upcoming |
| People | `2026-09-06-people-screen-mockup.html` | Friends/Groups tabs, tiers, hours together |
| First run | `2026-09-06-welcome-screen-mockup.html` | Mission screen → connect → success |
| Create | `2026-09-06-create-flow-mockup.html` | Pick person → Spont finds a time, or manual |
| Settings | `2026-09-06-settings-mockup.html` | Scheduling signals, caps, calendar, tier visibility |
| Accepting a friend | `2026-09-08-accept-friend-motion.html` | Four motion studies, replayable; records which was chosen and why |

Plus three motion studies (`connect-text-motion`, `kinetic-type`,
`sync-motion`) kept as reference for any future surface that needs
motion, and `2026-09-06-next-three-decisions.html`, the decision brief
that drove the second half of the day.

## Settled today

- **Visual system** — rounded (16px cards), soft shadows, neon green
  accent on a neutral ground, Sora + Manrope. Fully documented in
  `docs/knowledge-base/design-principles.md`, which was rewritten.
- **Navigation** — floating pill dock: **Home / People / Settings** plus a
  separate green create button. Settings was added back on 2026-09-08
  once it earned the weight (profile and appearance both live there);
  it's a gear, not a person, because a single-person icon reads as a
  near-copy of People's two-person one. The header avatar was
  briefly dropped as a duplicate of that dock stop, then put back the same
  day — see **Page headers** below.
- **Appearance** — three states, not a toggle: System / Light / Dark, in
  Settings. The old two-state toggle had no way back to following your
  phone once you'd touched it, and nothing on screen said so. Stored per
  device in localStorage, not on the account.
- **Notifications** — a dot on a dock tab and nothing else. Home when a
  proposal needs an answer, People when a friend request or group invite
  does. No bell, no count, nothing pushed. Watch out for the dock's label
  animation: it was written as "every span in a dock link" and swallowed the
  dot whole until it was scoped to `.dock-label`.
- **Page headers** — light/dark and your avatar are back on every screen,
  as one shared `HeadActions` component. Settings holds the fuller versions
  of both. They were briefly removed when Settings joined the dock; putting
  them back was a deliberate call on 2026-09-08.
- **Accepting a friend** — the row turns green where you tapped it and
  reads "Added Ming", then carries down to the slot they'll occupy in
  Your people and drains back to an ordinary row. No undo: nobody
  accepts a friend by accident. Four studies in
  `2026-09-08-accept-friend-motion.html`; this is D's confirmation with
  A's travel. Worth knowing if you revisit it — because the two sections
  are adjacent, the row itself only travels a few pixels. The movement
  really belongs to the page closing up around it.
- **Feed** — time filters (Today / This week / This month) replaced
  month grouping; cap raised to **two proposals a day**; accept and
  decline sit together at the foot of a card; an emptied feed reads
  "You're set."
- **Accepting** — five-second undo window with a draining ring; nothing
  reaches the calendar inside it.
- **Cancelling** — "Can't make it" from an Upcoming row; the slot goes
  back to the other person; ends on a nudge to text them directly.
- **Create** — Spont finds the time by default, manual path behind a
  disclosure that warns it hasn't checked the other person's calendar.
- **Ranking** — tiers and seasons, visible to friends. Flake score is
  off the cards entirely.
- **Which time wins** — Soonest by default, Roomiest as the alternative,
  chosen in Settings. It was a hardcoded "soonest", which is defensible
  for an app called Spont but means a scrappy Tuesday 9pm always beats a
  wide-open Saturday — and which of those you want isn't something the
  app can know about you.
- **Who gets the slot** — still whoever has the earliest gap. Asked and
  deliberately kept on 2026-09-08, with the trade named: it quietly
  favours whoever has the emptiest calendar, which is the thing most at
  odds with "see your friends more". Rotating by least-recently-proposed
  is the cheap fix if it starts to grate.
- **After a no** — nothing changes. Declining Thursday doesn't stop
  Thursday next week, and the same person can be re-proposed at once.
  Deliberate, per the spec's "revisit if testers find it naggy".
- **Scheduling signals** — Settings panel built. "When you're up for it"
  captures appetite (not availability) via weekday/weekend buckets that
  cycle plain → yes → never. Buffer is set in real minutes.

## Open, in rough priority order

1. **Calendar write-back.** Accepting a proposal changes nothing outside
   Spont. The rules already say who should hold an event
   (`shouldHoldEvent`), and the undo window is where the write goes; the
   Google call is what's missing. This is what makes the app real to
   somebody who doesn't open it.
2. **Generation wants to be a morning job**, not a feed-load side effect.
3. **Does a late cancel cost you tier?** Right now cancelling is free at
   any distance, so bailing twenty minutes before and four days before
   are identical to the system. This is the last piece of the
   reliability model and the one with the sharpest edges.
4. **What fuels the rank** — only "attended what you accepted" is
   honest; rewarding raw acceptances teaches people to say yes to
   everything.
5. **Should a hangout always be your set length?** Every proposal is
   exactly your hangout length whatever the gap. Asked and kept on
   2026-09-08; the alternatives were varying by time of day, or filling
   the window up to a cap.
6. **Categories** — Phase 2 builds the label taxonomy, at which point
   the "no data for it" reason cards were cut for expires. Decide before
   the data lands, not after. The fourth scheduling signal ("a mix of
   things") is already stubbed as pending in Settings.
7. **Connect screen timing** — five taglines at ~2.3s each against a
   one-second job. Either hold deliberately or cut to success after two.
   The "Stack" treatment in the kinetic study dissolves this.
8. **Card photos** — still placeholder art; camera-roll access is a
   permission scope no phase covers.
9. **Empty states aren't all the same.** Empty-Today is normal and good.
   Empty-This-month means the engine genuinely found nothing across 30
   days, and probably deserves different copy.
10. **`docs/superpowers/specs/2026-09-05-home-feed-design-notes.md` is now
   stale** — it still describes the white/red system and the flake score
   on cards. Either annotate it as superseded or fold what's live into a
   new spec.

## Gotchas worth knowing

**`npm test` wipes the dev database.** The suite runs against whatever
`DATABASE_URL` is in `.env` — the dev Neon branch — and `resetDb()` in
`packages/db/src/test-utils.ts` deletes every user. So a test run in the
middle of clicking through the app logs you out and voids your session
cookie, because the seeded users come back with new ids. `npm run db:seed`
puts them back. This cost real confusion once: the symptom is every route
redirecting to `/welcome` while the cookie still looks fine.

**Production is one migration behind.** `drop_notifications` has been
applied to dev but not to production — the deploy pipeline runs `next
build`, never `prisma migrate deploy`. The app is fine either way since
nothing references the table, but production still has an empty
`Notification` table and the drift will surface on the next migration.
Applying it needs the production connection string, which Vercel keeps
hidden from the CLI; Neon has it.

**A running dev server holds a stale Prisma client.** After
`prisma migrate dev`, the client on disk is regenerated but a dev server
started beforehand keeps the old one. The failure is quiet and misleading:
pages render, but any query selecting a new column throws, and code that
catches its own errors — the feed's proposal generator does — just
produces nothing. It looked exactly like a logic bug and cost a long
detour before the error was surfaced through a temporary route. **Restart
the dev server after every migration.** A tell: the Prisma error lists the
model's available fields, and they'll be the old set.

**Sessions outliving their user.** Related, and now fixed in
`app/layout.tsx`: the dock used to render whenever the cookie *verified*,
not when the person it named still existed, so a stale cookie put Home,
People and Settings on the signed-out welcome screen.

The mockups were published as private Artifacts during the session.
Those links only work for the account that published them — the files in
this repo are the shareable copy. Don't assume a teammate can open a
link from the chat.
