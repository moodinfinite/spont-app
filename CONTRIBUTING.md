# Contributing

## Workflow

1. Follow the local setup steps in `README.md`.
2. Work off the current phase's plan in `docs/superpowers/plans/`.
3. Write a failing test before implementation code (TDD) — see existing
   tests in `packages/core` and `packages/db` for the pattern.
4. Commit frequently with focused commits.

## Iteration loop across contributor backgrounds

This repo has both technical and non-technical contributors. Here's how
an idea gets from "someone noticed something" to "actually built,"
regardless of who noticed it:

1. Anyone has an idea or notices something worth changing.
2. If you're non-technical: describe it to your Claude session. It'll
   write it up in `docs/knowledge-base/proposals/` for you and save it —
   see `docs/knowledge-base/proposals/README.md`. Optionally, ask for a
   quick sanity check against existing decisions first (the
   `spont-product` agent).
3. A technical contributor checks `docs/knowledge-base/proposals/` for
   open ideas before starting new feature work, and picks one up as
   input the next time they run the `superpowers:brainstorming` skill —
   a proposal is an input to the normal design process, not a separate
   one.
4. The resulting spec/plan/implementation goes through the usual review
   (`spont-reviewer` for code, `spont-product` again for anything
   product/UI-facing before it ships).
5. Anything durable that comes out of the cycle — a new term, a new
   design rule, an architecture decision — goes into
   `docs/knowledge-base/`, not left buried in a phase-dated spec where
   it'll be hard to find later.

## Claude session memory

Each contributor gets their own directory under
`.claude/memory/<your-github-username>/`, copied from
`.claude/memory/TEMPLATE/`:

- `persistent/` — committed. Decisions, architecture notes, and gotchas
  that should survive across sessions and be visible to the rest of the
  team. Reviewed like any other change in a PR.
- `ephemeral/` — gitignored. Scratch notes and in-progress task state.
  Safe to discard at any time; never expected to be reviewed.
- `MEMORY.md` — committed index of what's in `persistent/`, kept short.

If you're unsure whether something belongs in `persistent/` or
`ephemeral/`, ask: would a teammate (or your own next session) want this
even after the task it came from is done? If yes, `persistent/`. If it's
just scratch space for getting through the current task, `ephemeral/`.
