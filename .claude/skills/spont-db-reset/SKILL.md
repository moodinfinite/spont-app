---
name: spont-db-reset
description: Use when asked to reset the Spont database to a clean state (fresh schema, fresh seeded fake users) — wraps the migrate + seed sequence into one step.
---

# Spont Database Reset

Resets the local Postgres database to a known-clean state: current
schema, 5 fresh seeded fake users (Alice, Bob, Carol, Dave, Erin), each
with a mock calendar account and sample events.

From `spont_app/`:

```bash
npm run db:migrate
npm run db:seed
```

If Postgres itself needs restarting first (not just the schema/data):

```bash
docker compose down -v
docker compose up -d
```

then run the two commands above. If Docker isn't available in this
environment, use whatever locally-running Postgres instance matches
`DATABASE_URL` in `.env` instead of the `docker compose` commands — see
`docs/knowledge-base/references.md`.

After running, confirm it worked: `npx dotenv -e .env -- npm test --workspace packages/db`
should pass (it creates and reads back real rows), and the app's login
picker (`/login`) should list all 5 seeded users. (Plain
`npm test --workspace packages/db`, without the `dotenv -e .env --`
wrapper, fails with `Environment variable not found: DATABASE_URL` —
that wrapper is what the root `npm test` script normally supplies, and
a workspace-scoped invocation bypasses it. See
`docs/knowledge-base/references.md`.)
