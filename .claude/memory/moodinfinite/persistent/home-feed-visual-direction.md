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

## Mockups

Living in `docs/superpowers/mockups/`, all published as Artifacts:

- `2026-09-06-home-feed-mockup-v2-rounded.html` — the feed. Carries a
  Gap control (loose/snug/tight/fused) as a review affordance, not app UI.
- `2026-09-06-people-screen-mockup.html` — Friends/Groups.
- `2026-09-06-welcome-screen-mockup.html` — first-run flow.
- Three motion studies: `2026-09-06-connect-text-motion-study.html`,
  `2026-09-06-kinetic-type-study.html`, `2026-09-06-sync-motion-study.html`.

Sample cast (renamed 2026-09-06): **Raghav** is the logged-in user;
friends are Jeff, Edward, Ming, Richard, Eric, Rod. Groups are The
Softest Lads, Kitchen Table, Sunday Run Club. "Trivia Crew", Alice, Bob,
Carol and Dave are retired — don't reintroduce them in new mockups.

## Status

**Not yet reconciled with `docs/knowledge-base/design-principles.md`,
deliberately.** That document still describes the white/red hairline
system, and this direction contradicts it on shape, color and type. The
session was run with principles explicitly held open ("we don't know
what will stick yet"), so the mockups are ahead of the docs on purpose.
Whoever takes this to a real spec needs to either rewrite
design-principles.md around this direction or decide the pivot was an
experiment. Note this also supersedes the previously flagged
photo-card exception — rounded corners are now the rule, not a violation.
