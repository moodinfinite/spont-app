# Spont

Spont helps friends find time to see each other using calendar availability.
The current goal is a functioning MVP for one private friend group, not a public product launch.

**Canonical repository: [moodinfinite/spont-app](https://github.com/moodinfinite/spont-app).**
Start from `main`: the rounded/green app is merged there. The app lives at this
repository's root now, not inside the old `nba-props-agent/spont_app` folder.

## Start here

- [Collaborator handoff](docs/HANDOFF.md): current behavior, gaps, preserved branches, and next tasks.
- [Contributing](CONTRIBUTING.md): branching, PRs, and safe test setup.
- [Design principles](docs/knowledge-base/design-principles.md): current visual direction.
- [Vercel setup](docs/setup-deploy.md): build settings and release procedure.

## Run locally

Use Node.js 24 (`.nvmrc`), npm, and Docker for local Postgres (or your own dedicated
development database). Run commands from the repository root.

```bash
git clone https://github.com/moodinfinite/spont-app.git
cd spont-app
npm ci
cp .env.example .env
docker compose up -d
npm run db:deploy
npm run dev
```

Open [localhost:3000](http://localhost:3000). The welcome page works without Google
credentials, but **signing in requires real Google OAuth**. The old test-user picker
was removed. Ask the maintainer for access to the test OAuth project, or configure
your own using [the Google guide](docs/setup-google-calendar.md).

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `.env`.
The local callback is `http://localhost:3000/api/auth/google/callback`. To try shared
availability, sign in as two test accounts in separate browser profiles and connect
using a friend invite link.

The example database URL targets the local Docker database. Keep development and
tests separate from the live friends-test database. Credentials, `.env`, `.neon`,
and `.vercel/` are excluded from Git.

`npm run db:seed` is optional fake-data setup that **deletes existing app data**.
It does not let you log in as a seeded user. Do not run it against real users.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local app |
| `npm run test:unit` | Scheduling/proposal tests; no database or Google credentials |
| `npm test` | All tests; deletes app data in the selected database |
| `npm run lint` | Frontend lint |
| `npm run build` | Production build, including lint and TypeScript |
| `npm run db:deploy` | Apply existing migrations to the selected database |
| `npm run db:migrate` | Author migrations during development |

See [isolated test setup](CONTRIBUTING.md#testing-without-touching-real-data) before
running the full suite. CI uses fresh Postgres to check migrations, all tests, and
the production build without production or Google secrets.

## Layout

```text
apps/web/       Next.js UI, auth, API routes, calendar integration
packages/core/ Business rules, scheduling helpers, tests
packages/db/   Prisma schema, migrations, seed data, database tests
docs/          Handoff, setup, product decisions, specs, visual mockups
```

Dated specs preserve historical plans. Read [HANDOFF.md](docs/HANDOFF.md) and current
code to distinguish implemented features from ideas.
