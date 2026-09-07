# Where the design stands — end of 2026-09-06

A snapshot for whoever picks this up next (Raghav asked for this
specifically). Companion to [[home-feed-visual-direction]],
[[reliability-ranking-direction]] and [[onboarding-flow-and-voice]],
which hold the reasoning; this holds the state.

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

Plus three motion studies (`connect-text-motion`, `kinetic-type`,
`sync-motion`) kept as reference for any future surface that needs
motion, and `2026-09-06-next-three-decisions.html`, the decision brief
that drove the second half of the day.

## Settled today

- **Visual system** — rounded (16px cards), soft shadows, neon green
  accent on a neutral ground, Sora + Manrope. Fully documented in
  `docs/knowledge-base/design-principles.md`, which was rewritten.
- **Navigation** — floating pill dock, now just **Home / People** plus a
  separate green create button. "You" was dropped: it duplicated the
  header avatar, which now persists on every screen and is the route
  into Settings.
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

## Gotcha worth knowing

The mockups were published as private Artifacts during the session.
Those links only work for the account that published them — the files in
this repo are the shareable copy. Don't assume a teammate can open a
link from the chat.
