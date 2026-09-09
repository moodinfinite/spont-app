# Home feed visual direction — rounded/green pivot (2026-09-06)

A full replacement of the white + red "specimen" visual system that the
home feed was previously built in. Decided in a design session on
2026-09-06 with the design principles explicitly treated as open — see
"Status" at the bottom before treating any of this as settled.

## The pivot

Driven by two references brought in by moodinfinite: a mountain-biking
meetup app (rounded cards, soft shadows, neon green, floating pill nav)
and a task app with horizontal date-filter pills. The previous system
(hairline rules, hard edges, no shadows, red accent, Jost/Space Mono)
was replaced wholesale rather than blended:

- **Shape:** soft rounded corners (26px cards, pill buttons) and soft
  shadows everywhere. This directly reverses the old no-shadows /
  no-rounded-corners rule in `docs/knowledge-base/design-principles.md`.
- **Color:** neon green `#C6FF4E` as the action accent on a neutral
  ground `#EDEEE9`; ink `#15150F`. Red is gone as the accent.
- **Type:** Sora (display) + Manrope (UI/body). Jost and Space Mono cut.
- **Nav:** floating rounded pill dock — reopening the earlier decision
  that deliberately rejected a pill dock for a squared one. "New" moved
  out of the dock into a separate circular green FAB beside it.

## Decisions worth keeping

- **The suggested card inverts the ground, it doesn't use the accent.**
  System-suggested proposals are a black card on the neutral ground
  (and a neon card in dark mode). Reason: most of the feed will be
  system suggestions, so making them the accent color would produce a
  wall of neon. Green stays the action color; black carries "this one
  came from Spont, not a person."
- **Time filters replaced month headers.** Today / This week / This
  month, cumulative, with counts carried over from the old month
  markers. Month grouping and its left-gutter marker are gone.
- **Accept and decline sit together** at the foot of the card ("I'm in"
  filled, "Not this time" outlined). They were previously split — accept
  at the top of the card, decline at the bottom — which separated two
  halves of one decision.
- **Card spacing: snug (8px).** Compared loose/snug/tight/fused live;
  below ~8px the soft shadows start muddying into each other.
- **Greeting breaks out of the card** — "Welcome Raghav." sits directly
  on the page ground, one weight, one color, not bold.
- **Flake score removed from cards entirely** (see
  [[reliability-ranking-direction]] for where it went instead).
- **Corner radius is 16px**, settled by comparing 8/16/26/36 live: 8
  fought the pill buttons and round dock, 36 read as a toy, 26 made
  cards feel like lozenges rather than objects.
- **Dark mode needs an edge, not a shadow.** Cards carry a 1px inset
  light edge, and ground/card are held far apart (`#0D0D0B` against
  `#292921`). This took two passes — the first lift wasn't enough, and
  the second had to bring chips, photo placeholders and the dock up too,
  since every surface sitting on a card has to keep clearing it.
- **The dock lost "You"** — a single-person icon beside People's
  two-person one, duplicating the header avatar. The avatar now persists
  on every screen and is the route into Settings.
- **Proposals cap raised to two a day**, and an emptied feed lands on
  "You're set" rather than reading as a failure to find anything.

See [[where-the-design-stands]] for the current state of every screen
and the list of what's still open.

## Mockups

Living in `docs/superpowers/mockups/`, all published as Artifacts:

- `2026-09-06-home-feed-mockup-v2-rounded.html` — the feed. Interactive:
  filters, accept with an undo window, decline, and cancel from Upcoming.
- `2026-09-06-people-screen-mockup.html` — Friends/Groups.
- `2026-09-06-welcome-screen-mockup.html` — first-run flow.
- Three motion studies: `2026-09-06-connect-text-motion-study.html`,
  `2026-09-06-kinetic-type-study.html`, `2026-09-06-sync-motion-study.html`.

Sample cast (renamed 2026-09-06): **Raghav** is the logged-in user;
friends are Jeff, Edward, Ming, Richard, Eric, Rod. Groups are The
Softest Lads, Kitchen Table, Sunday Run Club. "Trivia Crew", Alice, Bob,
Carol and Dave are retired — don't reintroduce them in new mockups.

## Status

**Reconciled.** `docs/knowledge-base/design-principles.md` was rewritten
later the same day around this direction, and is now the source of truth
for the visual system — this note holds the reasoning behind the pivot,
not the spec. The rewrite keeps a closing section recording what the old
white/red system solved and how the new one solves it differently, so
reverting stays possible if the pivot turns out to have been an
experiment. It also supersedes the previously flagged photo-card
exception: rounded corners are the rule now, not a violation.

**Still stale:**
`docs/superpowers/specs/2026-09-05-home-feed-design-notes.md` predates
all of this and still describes the white/red system and per-card flake
scores. It hasn't been touched — it's point-in-time design history by
the repo's own convention, but anyone reading it cold will be misled.
Worth annotating as superseded.
