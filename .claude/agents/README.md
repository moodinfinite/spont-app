# Spont agents

Repo-committed subagents, tuned to this repo's actual conventions and
decisions — not generic. Every contributor's Claude session can invoke
these by name.

## Built

- **`spont-reviewer`** — code review, primed on the `AppError`/
  `toErrorResponse` error contract, the `CalendarProvider` seam, and the
  `packages/core`/`apps/web` boundary. For technical contributors
  reviewing or writing code.
- **`spont-product`** — product/design review, primed on
  `docs/knowledge-base/design-principles.md` and the existing home-feed
  design notes. For anyone — especially non-technical contributors —
  sanity-checking an idea against decisions already made, without
  needing to read code.

## Reserved (not built yet)

- **`spont-analyst`** — intended for analyzing real app data (hangout
  frequency, flake scores, engagement trends) once Phase 3+ produces
  actual scheduling/engagement data to analyze. Not built in this phase
  because there's no real data yet — an agent built against data that
  doesn't exist would just be speculative scaffolding. Build this once
  Phase 3 or later ships and there's something real to analyze.
