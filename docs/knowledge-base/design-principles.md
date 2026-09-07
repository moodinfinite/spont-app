# Design principles

The durable, reusable visual system and product-decision patterns for
Spont. Check here first for any new UI work.

**Rewritten 2026-09-06.** This document previously described a white +
red "specimen" system built on hairline rules, hard edges and no
shadows. That system was replaced wholesale in a design session on
2026-09-06 — see the "What changed" note at the bottom for what was
dropped and why, so the history isn't lost. Feature-specific history for
the home feed lives in
`docs/superpowers/specs/2026-09-05-home-feed-design-notes.md`, which
predates this rewrite and still describes the old system.

## The core method: borrow cues, not formats

Unchanged, and the most portable thing in this document. When drawing on
a visual reference (a poster, an app, a type specimen), pull the
*vocabulary* — specific colour relationships, shape language, structural
devices — not the whole format.

Two worked examples, both real:

- An early home-feed pass borrowed a type specimen's *format* and
  rendered proposals as spec-style label/value tables. Rejected: a feed
  needs to read as a feed, not a form.
- The current system takes its shape language and colour energy from a
  meetup app, but **not** its content structure. What carried over was
  the idea that an algorithmic suggestion and a human invitation should
  look like different objects — which mapped onto Spont's own
  friend-initiated vs system-suggested split.

Identify what a reference is actually contributing, and take only that.

## Colour

Four roles. Everything on screen takes one of them.

| Role | Light | Dark |
| --- | --- | --- |
| Ground | `#EDEEE9` | `#121210` |
| Card | `#FFFFFF` | `#1C1C17` |
| Ink | `#15150F` | `#F2F2EA` |
| Accent (green) | `#C6FF4E` | `#D2FF66` |

- **Green means action.** Primary buttons, the active filter, the create
  button, the confirmation check. It is never decoration and never a
  large background field in the app proper.
- **The one exception is the first-run flow**, where green is the entire
  ground. That screen is the app introducing itself; it gets to be loud
  once. Nowhere else.
- **Black is emphasis, not a colour.** The system-suggested card is a
  black card on the neutral ground (and inverts to green-on-dark in dark
  mode). Reason worth remembering: most of the feed will be system
  suggestions, so making *them* the accent colour produces a wall of
  neon and the accent stops meaning "act on this."
- **Semantic colour is separate from the accent.** A warning red
  (`#E14B3A`) exists for notification badges and genuine problem states.
  It is not a second brand colour.

Both themes are first-class. Every colour is a token defined on bare
`:root`, redefined for `prefers-color-scheme: dark` and again for an
explicit `[data-theme="dark"]`, so a page renders correctly whether the
viewer has chosen a theme or left it on system.

## Shape and surface

- **Soft, rounded, shadowed.** Cards and panels are 16px radius with a
  soft two-layer shadow; inner crops (a card's photo) sit at 11px;
  buttons, chips, avatars and the nav dock are full pills (999px).
  16px was chosen against 8, 26 and 36: 8 fought the pill buttons and
  round dock, 36 read as a toy, and 26 made cards feel like lozenges
  rather than objects.
- **Dark mode needs an edge, not a shadow.** A drop shadow does nothing
  against a dark ground, so in dark themes cards carry a 1px inset
  light edge alongside the shadow, and the ground/card pair is held far
  enough apart (`#0D0D0B` against `#1F1F1A`) that surfaces don't
  dissolve into the page.
- **No borders as separators between cards** — elevation does that work.
  Hairlines (1.5px at ~8% ink) are only used *inside* a surface, to
  divide rows of a list.
- **Spacing between feed cards is 8px.** Compared against 14px, 3px and
  zero: below roughly 8px the soft shadows begin muddying into each
  other, which is the floor this number comes from.

## Typography

Two typefaces, each with one job:

- **Sora** — display. Headlines, names, numbers that matter, the
  greeting. Set at 400 for anything large and editorial (the greeting,
  mission copy); 700 only for small labels and names inside cards.
- **Manrope** — everything else. Body copy, buttons, metadata, captions.
  400–700 as needed.

**Big type is not bold type.** The greeting and the mission statement
are large and regular-weight. Bold is for small text that needs to
survive being small, not for making large text louder. Use
`font-variant-numeric: tabular-nums` wherever digits line up.

## Layout patterns

- **Page headers break out of the card system.** "Welcome Raghav.",
  "People." — these sit directly on the ground, one weight, one colour,
  no container. Chrome belongs in cards; identity doesn't.
- **Navigation is a floating pill dock**, dark, with the primary create
  action pulled out into a separate circular accent button beside it.
  This deliberately reopens and reverses the earlier squared-dock
  decision. Non-active dock items are icon-only; every item is at least
  46×46 so it stays tappable.
- **Filtering is horizontal pills at the top of a list**, active one
  filled with the accent. This replaced month-header grouping in the
  feed — time filters (Today / This week / This month) are cumulative
  and carry counts.
- **Tabs merge closely-related screens.** Friends and Groups are one
  "People" screen with a tab pair, not two dock destinations.

## Interaction patterns

- **Both halves of a decision live together.** Accept and decline sit
  side by side at the foot of a card — filled accent for the affirmative,
  outlined for the negative. Splitting them across a card (accept at the
  top, decline at the bottom) separates one decision into two, and was
  fixed for exactly that reason.
- **One primary action per card.** If a card has a second action, it is
  visually quieter, not a second filled button.
- **Motion resolves, it doesn't decorate.** Where something is being
  computed or connected, the animation should look like search and
  resolution — the loading mark converges, the progress fills, the
  screen lands somewhere. Three comparison studies exist in
  `docs/superpowers/mockups/` (text motion, kinetic type, abstract sync)
  if a new surface needs one.
- **Respect `prefers-reduced-motion`** everywhere: animation off,
  end-state visible.

## Reputation and ranking

- **Tiers, not numbers.** Reliability is Flaky → Casual → Steady → Solid
  → Ride or Die, rendered as one gem emblem that fills as the tier
  rises. The underlying score is never shown. A number out of 100 reads
  as a credit score; a tier reads as identity.
- **Only the top tier gets the accent colour**, so rank stays inside the
  palette rather than importing bronze/silver/gold.
- **Seasons.** Rank resets periodically so a bad stretch doesn't brand
  someone permanently. Forgiveness is structural, not a special case.
- **Rank is visible to friends; the flattering number travels furthest.**
  Hours-together is shared freely. See
  `.claude/memory/moodinfinite/persistent/reliability-ranking-direction.md`
  for the reasoning and what's still open.
- **Never charge someone for honesty.** Declining early and bailing after
  committing are different acts. A decline costs nothing; only
  accept-then-no-show should ever affect reliability. This is why the
  decline button says "Not this time" and not "Flake."

## Product-decision patterns

- **Prefer plain, human copy over administrative language.** "I'm in" /
  "Not this time", never "Approve" / "Deny". Errors and empty states get
  the same voice.
- **Cut fields that don't have real backing data yet** rather than
  shipping a placeholder. Location and category were both cut from cards
  for this reason. Note the expiry: Phase 2 builds a label taxonomy, so
  the "no data" argument against categories runs out then, and that's a
  decision to make on purpose rather than by default.
- **Quiet is a valid state, not a failure.** The feed caps proposals per
  day deliberately, so an empty or near-empty feed is the normal case.
  It should read as the goal being met — less time in the app — not as
  the app having found nothing.
- **No speculative configurability.** Add controls when real usage shows
  people want them. (Being revisited for Phase 3's scheduling signals,
  which the foundation spec does commit to making configurable.)

## What changed on 2026-09-06, and what it cost

The previous system was: off-white ground, red accent, near-black ink,
Jost + Space Mono, hairline rules, hard edges, no shadows, a grain
overlay, month bands, and a squared bottom dock. It was coherent and
well-argued, and it is gone.

Three things worth carrying forward from it even though the surface
changed: the borrow-cues-not-formats method (kept above), the insistence
that the accent colour means something rather than decorating, and the
plain-spoken copy voice. Two things it solved that the new system solves
differently: separating elements (hairlines → elevation) and keeping
flat colour from looking dead (grain → soft shadow and a live accent).

The pivot was made during an explicitly open-ended session. If it turns
out to have been an experiment, this document should be reverted rather
than quietly patched — the old system is recoverable from git history
and from the home-feed design notes.
