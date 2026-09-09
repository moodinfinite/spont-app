# Contributing

## Workflow

1. Read [README.md](README.md) and [docs/HANDOFF.md](docs/HANDOFF.md).
   Work in `moodinfinite/spont-app`, from the repository root.
2. Create a focused branch from current `main`; the rounded/green work is already
   merged. Preserved feature branches need reconciliation before integration.
3. Open a PR targeting `main` with the user-visible outcome, focused regression
   tests for behavior changes, and screenshots for UI changes.
4. Run `npm run test:unit` and `npm run build`. Use disposable Postgres for
   database-backed tests. CI checks migrations, all tests, and the build.
5. Add new migrations for schema changes, update `docs/HANDOFF.md` when status or
   setup changes, and commit focused changes. Seek collaborator review when
   available; do not force-push `main`.

## Testing without touching real data

`npm run test:unit` needs no database or Google account. `npm test` calls
`resetDb()` and deletes app data. Use a dedicated test database, not the database
holding your sign-in sessions or the live friends test.

With the local Docker service running, create the test database once:

```bash
docker compose exec -T postgres psql -U spont -d postgres -c 'CREATE DATABASE spont_test;'
DATABASE_URL=postgresql://spont:spont@localhost:5432/spont_test npm run db:deploy
DATABASE_URL=postgresql://spont:spont@localhost:5432/spont_test npm test
```

The explicit environment variable overrides `.env`. CI uses a fresh Postgres
service and no live secrets. Do not run multiple test processes against the same
database concurrently.

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
