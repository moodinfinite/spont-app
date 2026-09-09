# Spont App

## Current repository and handoff

The canonical repository is `moodinfinite/spont-app`. Start from `main`, which
includes the rounded/green app. The app lives at this repository's root.
Read `README.md`, `docs/HANDOFF.md`, and `AGENTS.md` before older plans or memory.
Do not recreate removed UI based solely on historical documentation. A personal
memory file or a specific assistant product is not required to contribute.

## New here? Start by picking a path

- **Non-technical / product contributor** — you have opinions on what
  Spont should do or look like, but don't need to touch code. Start at
  [`docs/knowledge-base/README.md`](docs/knowledge-base/README.md), and
  drop ideas in
  [`docs/knowledge-base/proposals/`](docs/knowledge-base/proposals/README.md).
  Just tell your Claude session what you're here to do — it'll ask your
  background once and remember it (see `spont-onboarding` below).
- **Technical contributor** — you're writing code, running the app, or
  reviewing a diff. Continue below for setup and structure.

See `README.md` for setup and `CONTRIBUTING.md` for the full contributor
workflow.

## Commands

```bash
npm run dev       # http://localhost:3000
npm test          # Vitest across packages/db and packages/core
npm run db:seed   # reset + reseed 5 fake users
```

(Or use the `spont-dev-server` / `spont-db-reset` skills, which do the
same thing with a safety check that plain commands don't — see Skills
and agents below.)

## Codebase structure

```
apps/web/            # Next.js app — pages, API routes, login. The only
                     # piece that knows about HTTP/cookies/pages.
packages/core/       # Business rules (Friends, Groups, CalendarProvider
                     # interface) — no knowledge of the web layer.
packages/db/         # Prisma schema, client, seed data.
docs/superpowers/    # Phase-by-phase specs and implementation plans —
                     # point-in-time, becomes history once a phase ships.
docs/knowledge-base/ # Durable context — architecture, glossary, design
                     # principles, references, proposals. Doesn't expire.
.claude/skills/      # Shared skills any contributor's session can use.
.claude/agents/      # Shared subagents (code review, product review).
.claude/memory/      # Per-contributor session memory (see below).
```

See `docs/knowledge-base/architecture.md` for *why* it's shaped this way.

## Skills and agents

Repo-committed, available to any contributor's session:

- **Skills** (`.claude/skills/`): `spont-onboarding` (detects contributor
  background — read this one first, it changes how the rest of a session
  should behave), `spont-dev-server`, `spont-db-reset`, `spont-status`.
- **Agents** (`.claude/agents/`): `spont-reviewer` (code review),
  `spont-product` (product/design review). Roster and rationale in
  `.claude/agents/README.md`.

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
   Only open individual `persistent/*.md` files the index points at,
   with one named exception: `persistent/role.md` (if present) is
   machine-read config for the `spont-onboarding` skill, not
   human-authored memory — that skill reads it directly, regardless of
   whether MEMORY.md's index mentions it.
4. Don't read or write another contributor's `.claude/memory/<other>/`
   directory unless explicitly asked to (e.g. reviewing a teammate's notes).

**Memory design:** `persistent/` is committed and PR-reviewed — decisions,
gotchas, anything worth surviving past the task that produced it.
`ephemeral/` is gitignored scratch space, discard freely. A contributor's
declared technical/non-technical role also lives in
`persistent/role.md` — see the `spont-onboarding` skill.

**Gotcha:** `.gitignore` ignores `.claude/memory/*/ephemeral/*` and nothing
else under `.claude/` — deliberately narrow, so `persistent/` and the shared
`skills/` and `agents/` commit normally. Broadening it to a bare `.claude/`
silently breaks the whole contributor-memory convention: `git add` on any
persistent file starts failing, and the shared tooling stops being shared.

Current phase: see `docs/superpowers/specs/` for the latest design and
`docs/superpowers/plans/` for the active implementation plan.
