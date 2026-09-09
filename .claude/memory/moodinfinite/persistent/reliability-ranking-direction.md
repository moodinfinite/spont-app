# Reliability ranking — tiers, seasons, mastery (2026-09-06)

Where the flake score went. Decided in the same 2026-09-06 design
session as [[home-feed-visual-direction]].

## What changed and why

The old flake score (0–100, shown per friend on every feed card) is out
of the home feed. Two problems drove the change:

1. **A /100 number reads like a credit score.** It made the feed a
   ranking of your friends — a risk the original home-feed notes already
   flagged as deliberate-but-dangerous.
2. **A tried-and-rejected middle step:** renaming decline to "Flake"
   with a live score penalty. Killed because it punishes honesty —
   declining early and bailing after committing are different acts, and
   charging the same cost for both pushes people to ghost or to
   accept-then-vanish, which is worse for everyone. The button is back
   to "Not this time".

## The direction now

Modelled on League of Legends rather than Duolingo — identity you
display, not a streak you're afraid to break.

- **Tiers, not numbers.** Flaky → Casual → Steady → Solid → Ride or Die.
  The underlying number is never shown. Rendered as one gem emblem that
  fills as the tier rises; only the top tier is green, so it stays
  inside the palette instead of importing bronze/silver/gold.
- **Seasons.** Rank resets periodically (mockup shows "S2 · 18d"), so a
  bad month during a move or a new job doesn't brand someone for years.
  Forgiveness is built into the structure rather than bolted on.
- **Rank is visible to friends.** Explicitly decided. This is the load-
  bearing social-pressure choice and the riskiest part of the design —
  showing someone that a friend sees them as "Flaky" is heavier than
  showing a game rank. Revisit if it tests badly.
- **Time together is the other number** — hours you and a person have
  actually both shown up for. It's the mission measured directly, and
  it's the flattering one, which is why it's the one shared most freely.
- **Friend Mastery is parked, not dropped.** Per-friendship levels fed
  by hours together (LoL Champion Mastery, applied to people). Agreed as
  a good idea, deferred to the Friends screen work rather than the feed.

## Explicitly rejected

- Duolingo-style mechanics: daily streaks, guilt nudges, "don't lose
  your progress" pressure.
- Any per-card display of a friend's reliability score in the feed.
- Making decline cost the user anything.

## Open

- What actually fuels the rank — only "attended what you accepted" is
  honest; rewarding raw acceptances teaches people to say yes to
  everything and sort it out later.
- moodinfinite is open to a different visual treatment of rank than the
  gem/tier chip currently in the People mockup.
