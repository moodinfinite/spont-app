# Spont

A scheduler that helps close friends spend more time together spontaneously,
by cutting down the time it takes to find when everyone's free.

This repo is mid-build. See `docs/superpowers/specs/` for the phase-by-phase
design and `docs/superpowers/plans/` for implementation plans.

## New here? Start by picking a path

- **Non-technical / product contributor** — you don't need to do
  anything below. Start at
  [`docs/knowledge-base/README.md`](docs/knowledge-base/README.md)
  instead, and see `CLAUDE.md` for how your Claude session will get
  oriented to your background automatically.
- **Technical contributor** — continue below.

## Local setup

1. `npm install`
2. `cp .env.example .env`
3. `docker compose up -d` (starts local Postgres)
4. `npm run db:migrate`
5. `npm run db:seed`
6. `npm run dev` — app runs at http://localhost:3000

Pick any seeded user on the login screen to explore the app as them. No
real Google account or Google Calendar connection is needed yet — Phase 1
runs entirely against seeded fake data (see the Phase 1 design spec for why).

## Running tests

`npm test` (runs Vitest across `packages/db` and `packages/core`; requires
Postgres running per the setup steps above).

## Contributing

See `CONTRIBUTING.md`, including the per-contributor Claude memory
convention under `.claude/memory/`.
