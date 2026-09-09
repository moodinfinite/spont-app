# Deploying Spont on Vercel

Canonical source: `moodinfinite/spont-app`, production branch `main`.
The repository root is the app workspace. Old instructions pointing to
`echao49/nba-props-agent` and a root directory of `spont_app` are obsolete.

## Project configuration

Reuse Vercel project `spont_app` and its existing domain,
`https://spontapp.vercel.app`. Verify **Settings → Git** points to the new repo;
pushing source alone does not create this connection. The account owner may need
to grant the Vercel GitHub app access. See
[Vercel's GitHub guide](https://vercel.com/docs/git/vercel-for-github).

| Setting | Value |
| --- | --- |
| Repository | `moodinfinite/spont-app` |
| Production branch | `main` |
| Root directory | Repository root (leave blank) |
| Framework | Next.js |
| Install | `npm install` |
| Build | `npm run build` |
| Output | `apps/web/.next` |

Build settings are also in `vercel.json`. Preserve the working deployment while
resolving connection problems. A public source repo is not a public app launch.

## Environment

Configure these separately for Production and Preview in Vercel:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Database for the selected deployment environment |
| `SESSION_SECRET` | Long random secret; not the example development value |
| `GOOGLE_CLIENT_ID` | OAuth client |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Exact deployed OAuth callback URL |

The existing domain's callback is
`https://spontapp.vercel.app/api/auth/google/callback`. Keep localhost registered
separately. Arbitrary preview URLs need explicit OAuth setup before sign-in works.
Check test-user access with the OAuth project owner; the
[Google guide](setup-google-calendar.md) provides background.

Keep development and automated tests isolated from the live database. Never copy
secrets into Git, PR descriptions, issues, or CI configuration.

## Migrations are separate from deployment

**Neither `npm run build` nor Vercel deployment applies migrations.** Install only
generates Prisma's client.

1. Review new SQL in `packages/db/prisma/migrations` and test the chain on disposable
   Postgres (CI does this).
2. Coordinate schema and app releases. Use a separate database or maintenance
   window for incompatible changes; historical migrations remove `Notification`.
3. Securely set `DATABASE_URL` to the intended deployment database, then run
   `npm run db:deploy`. An externally supplied value takes precedence over `.env`.
4. Deploy the matching revision and smoke-test Google sign-in, People, Home, and
   proposal responses with test accounts.

`db:migrate` is for authoring migrations in development. Never run `db:seed`,
`npm test`, or reset workflows against the live database.

## Limits

See [HANDOFF.md](HANDOFF.md). Token encryption is not implemented in the app,
reconnect status is incomplete, and calendar writing/background notifications
remain unfinished.
