# References and gotchas

Notes on external tools/services this project depends on, and specific
things that went wrong (and how they were fixed) while building it —
so the same problem doesn't get rediscovered from scratch.

## Local Postgres without Docker

The documented setup (`README.md`) uses `docker compose up -d` to run
Postgres locally. Some environments this repo has been built in don't
have Docker installed at all. In that case, a locally-installed Postgres
instance configured with the same credentials as `.env.example`'s
`DATABASE_URL` (user `spont`, password `spont`, database `spont`, port
5432) works identically for every purpose `docker compose` would serve —
migrations, seeding, and the test suite all just need a reachable
Postgres matching that connection string, not specifically a
Docker-managed one.

## `next.config.js` must use ESM syntax, not CommonJS

`apps/web/package.json` sets `"type": "module"`, which makes Node treat
every `.js` file in that package as an ES module. A `next.config.js`
written with `module.exports = ...` (the older, still-common pattern in
most Next.js documentation/examples) throws `ReferenceError: module is
not defined in ES module scope`. Use `export default ...` instead — Next.js
supports this natively.

## Vitest runs test files in parallel by default — a problem for a
## shared live Postgres instance

Two test files in the same package that both call a full-table-reset
helper (like this repo's `resetDb()`) in `beforeEach`, and both use
hardcoded fixture data (like the same email address), will race against
each other if Vitest runs them in separate parallel workers against one
shared database — one file's reset can wipe data the other file is
mid-assertion on. Fix: set `fileParallelism: false` in `vitest.config.ts`
for any package whose tests hit a real, shared database. (`packages/db`
and `packages/core` both have this set, for exactly this reason.)

## A repo-root `.gitignore` pattern can silently break a subdirectory's
## more specific one

Git evaluates `.gitignore` files from the repository root inward. A
broad, unanchored pattern in the root `.gitignore` (e.g. a bare
`.claude/` with no leading slash) matches `.claude/` directories at any
depth in the repo — including one meant to be handled differently by a
more specific `.gitignore` several directories down. A nested
`.gitignore`'s negation pattern (an `!`-prefixed rule meant to
re-include something) cannot override a broader exclusion from a parent
directory's `.gitignore` — git prunes the excluded directory from
traversal before the nested negation is ever considered. Fix: anchor the
root pattern to `/.claude/` (repository root only) if a nested directory
of the same name needs its own, different rules.

## A workspace-scoped `npm test --workspace <pkg>` bypasses the root
## script's `dotenv` wrapper, losing `DATABASE_URL`

The root `package.json`'s `test` script is
`dotenv -e .env -- npm run test --workspaces --if-present`, which loads
`.env` before running every workspace's tests. Running
`npm test --workspace packages/db` (or `packages/core`) directly, as a
shortcut to test just one package, does *not* go through that root
script — npm resolves straight to `packages/db/package.json`'s own
`test` script (`vitest run`), with no `.env` loaded, so it fails with
`Environment variable not found: DATABASE_URL`. Fix: wrap the
workspace-scoped call the same way the root script does —
`npx dotenv -e .env -- npm test --workspace packages/db` — instead of
calling it plain.

## `gh` CLI's own OAuth token can silently override what you'd expect
## to authenticate a `git push`

If `git config --list` shows a per-host `credential.https://github.com.helper`
pointing at `gh auth git-credential`, then clearing a cached credential
in the OS keychain (e.g. `git credential-osxkeychain erase`) has no
effect on GitHub pushes — `gh`'s own stored OAuth token is what
actually authenticates, and it can be missing a required scope (e.g.
`workflow`, needed to push changes under `.github/workflows/`) without
any indication other than GitHub's rejection message naming "an OAuth
App." Fix: `gh auth refresh -h github.com -s <missing-scope>` re-runs
`gh`'s own device-code auth flow to add the missing scope, rather than
regenerating a personal access token that `gh` wouldn't even be using.
