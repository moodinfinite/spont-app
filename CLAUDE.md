# Spont App

See `README.md` for setup and `CONTRIBUTING.md` for the full contributor
workflow.

## Commands

```bash
npm run dev       # http://localhost:3000
npm test          # Vitest across packages/db and packages/core
npm run db:seed   # reset + reseed 5 fake users
```

## Multi-user contributor memory

This repo has multiple contributors, each with an isolated directory at
`.claude/memory/<github-username>/` (policy detail in `CONTRIBUTING.md`).
At the start of a session:

1. **Identify the contributor** — try `git config user.email`/`user.name`,
   or `gh api user --jq .login` if `gh` is authenticated. If still
   ambiguous, ask the user rather than guessing.
2. If `.claude/memory/<username>/` doesn't exist yet, copy it from
   `.claude/memory/TEMPLATE/`.
3. Read `.claude/memory/<username>/MEMORY.md` first — it's a short index.
   Only open individual `persistent/*.md` files the index points at.
4. Don't read or write another contributor's `.claude/memory/<other>/`
   directory unless explicitly asked to (e.g. reviewing a teammate's notes).

**Memory design:** `persistent/` is committed and PR-reviewed — decisions,
gotchas, anything worth surviving past the task that produced it.
`ephemeral/` is gitignored scratch space, discard freely.

**Gotcha:** the repo-root `.gitignore`'s `.claude/` rule is anchored to
`/.claude/` (repo root only) *on purpose* — this is what lets
`spont_app/.claude/memory/*/persistent/` commit normally while
`ephemeral/` stays ignored via `spont_app/.gitignore`'s own rules. Widening
that root pattern back to a bare `.claude/` silently breaks the whole
contributor-memory convention (a bare `git add` on any persistent file
would start failing repo-wide).

Current phase: see `docs/superpowers/specs/` for the latest design and
`docs/superpowers/plans/` for the active implementation plan.
