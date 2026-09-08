# Where the design stands — updated 2026-09-08 (evening)

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

**Notifications were removed** (page, API, and the bell) rather than
left half-built.

## Code that exists behind it

- `packages/core/src/scheduling/free-slots.ts` — the matcher. Inverts
  busy blocks into gaps, intersects across people, drops anything too
  short. 18 tests.
- `packages/core/src/proposals/rules.ts` — the lifecycle. A 1:1 needs
  every yes, a group needs two; nobody holds a calendar event for a
  hangout that isn't happening. 29 tests.
- `apps/web/lib/google-calendar.ts` — reads real availability from
  Google, refreshing the access token when it's stale.
- `Proposal` and `ProposalParticipant` exist as tables.

**Nothing creates a Proposal row yet.** That's the gap between "the
pieces work" and "the app does something" — the matcher and the rules
are both tested and unused. It's the next real piece of work.

**`hangoutTimes` is collected but not read by the matcher.** Small
wire-up, both halves exist.

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
  near-copy of People's two-person one. That's also why the *header*
  avatar is gone — with a dock stop it was a duplicate, and page headers
  now carry nothing but their own title.
- **Appearance** — three states, not a toggle: System / Light / Dark, in
  Settings. The old two-state toggle had no way back to following your
  phone once you'd touched it, and nothing on screen said so. Stored per
  device in localStorage, not on the account.
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
- **Scheduling signals** — Settings panel built. "When you're up for it"
  captures appetite (not availability) via weekday/weekend buckets that
  cycle plain → yes → never. Buffer is set in real minutes.

## Open, in rough priority order

1. **Does a late cancel cost you tier?** Right now cancelling is free at
   any distance, so bailing twenty minutes before and four days before
   are identical to the system. This is the last piece of the
   reliability model and the one with the sharpest edges.
2. **What fuels the rank** — only "attended what you accepted" is
   honest; rewarding raw acceptances teaches people to say yes to
   everything.
3. **Categories** — Phase 2 builds the label taxonomy, at which point
   the "no data for it" reason cards were cut for expires. Decide before
   the data lands, not after. The fourth scheduling signal ("a mix of
   things") is already stubbed as pending in Settings.
4. **Connect screen timing** — five taglines at ~2.3s each against a
   one-second job. Either hold deliberately or cut to success after two.
   The "Stack" treatment in the kinetic study dissolves this.
5. **Card photos** — still placeholder art; camera-roll access is a
   permission scope no phase covers.
6. **Empty states aren't all the same.** Empty-Today is normal and good.
   Empty-This-month means the engine genuinely found nothing across 30
   days, and probably deserves different copy.
7. **`docs/superpowers/specs/2026-09-05-home-feed-design-notes.md` is now
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

**Sessions outliving their user.** Related, and now fixed in
`app/layout.tsx`: the dock used to render whenever the cookie *verified*,
not when the person it named still existed, so a stale cookie put Home,
People and Settings on the signed-out welcome screen.

The mockups were published as private Artifacts during the session.
Those links only work for the account that published them — the files in
this repo are the shareable copy. Don't assume a teammate can open a
link from the chat.
