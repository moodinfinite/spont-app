# Contributing

## Workflow

1. Follow the local setup steps in `README.md`.
2. Work off the current phase's plan in `docs/superpowers/plans/`.
3. Write a failing test before implementation code (TDD) — see existing
   tests in `packages/core` and `packages/db` for the pattern.
4. Commit frequently with focused commits.

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

**Note:** A root-level `.gitignore` rule prevents plain `git add` from seeing
files under `.claude/memory/`. When you first create your memory directory and
each time you add new files to it, use `git add -f .claude/memory/<your-username>/`
or `git add -f <specific file>` to force-stage your changes.

If you're unsure whether something belongs in `persistent/` or
`ephemeral/`, ask: would a teammate (or your own next session) want this
even after the task it came from is done? If yes, `persistent/`. If it's
just scratch space for getting through the current task, `ephemeral/`.
