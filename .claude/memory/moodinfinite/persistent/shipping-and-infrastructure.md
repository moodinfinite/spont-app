# Shipping — database, hosting, Google (2026-09-07/08)

Spont stopped being mockups and became a running app on a public URL.
This is the operational half; [[where-the-design-stands]] holds the
product state.

**Live at <https://spontapp.vercel.app>.**

## What's wired up

| Piece | Where | Notes |
| --- | --- | --- |
| Database | Neon Postgres, project `cold-fog-22479086` | `.env.local` is Neon-managed; don't hand-edit it |
| Hosting | Vercel, project `spont_app` | Deployed from a laptop via CLI, not from GitHub |
| Auth | Google OAuth, app in Testing mode | Sign-up *is* connecting your calendar |

Setup guides live in `docs/setup-google-calendar.md` and
`docs/setup-deploy.md`. Both were written while doing it, so they cover
the parts that actually went wrong rather than the happy path.

## Gotchas that cost real time

**Vercel blocks deploys whose commit email isn't on a GitHub account.**
This one cost an afternoon. Commits were authored as
`iamjeffreywu@gmail.com`, which wasn't on the `moodinfinite` GitHub
account, so every build was blocked *before it started*. The CLI showed
this as "Building…" forever with `UNKNOWN` status and no build logs; the
Vercel dashboard said it in one plain sentence. **When a Vercel build
behaves strangely, read the dashboard before trusting the CLI.** Fixed by
adding the address at github.com/settings/emails, which also links the
existing commits retroactively.

**A dev server left running holds the old Prisma client, and an advisory
lock.** Two symptoms from one cause. After a migration, queries selecting
a new column throw against the stale client — quietly, if the caller
catches its own errors. And `prisma migrate dev` will sit on
"Timed out trying to acquire a postgres advisory lock" until the server
lets go. Stop the dev server, migrate, start it again.

**`prisma migrate dev` hangs without `--name`.** It's waiting for a
migration name on a prompt you can't see in a captured shell.

**The npm scripts load `.env.local` first, then `.env`.** Neon owns
`.env.local` and rewrites it; hand-written values (session secret, Google
credentials) go in `.env`. Both are gitignored.

**`postinstall` runs `prisma generate`.** Without it Vercel's bare
`npm install` leaves the client ungenerated and the build dies. Don't
remove it.

**A session outliving its user causes a redirect loop.** Reseeding wipes
the users table while cookies still verify, so the feed bounced to
`/welcome` and `/welcome` bounced back. `/welcome` now checks the user
still exists rather than trusting the signature. Same bug would hit any
deleted account.

## Known risks, in the order they'll bite

1. **Local and production share one Neon database.** A migration run from
   a laptop changes what testers are using, live. Wants a second Neon
   branch before anyone depends on it.
2. **Refresh tokens are stored unencrypted.** Acceptable for an
   allowlisted test with people you know; not beyond that. A refresh
   token is long-lived read access to somebody's calendar.
3. **Deploys are snapshots of a laptop, not the branch.** Pushing to
   GitHub does not update the site — someone must run
   `npx vercel --prod`. Connecting the repo needs admin on
   `echao49/nba-props-agent`, which moodinfinite does not have (push
   only). Easiest fix is for the owner to import it on Vercel and add
   collaborators to the project.
4. **Google is in Testing mode**, so refresh tokens expire in about a
   week and only allowlisted addresses can sign in at all. Both scopes
   are classified non-sensitive, so publishing should not require a
   verification review — worth doing before a multi-week test.

## Adding a tester

1. Google console → consent screen → **Audience → Test users** → add
   their Gmail. Without this Google refuses them outright.
2. Send them their invite link from the app.
3. **Warn them about the "Google hasn't verified this app" screen** in
   the same message — they need Advanced → Go to Spont (unsafe), and it
   looks exactly like something you'd tell a friend never to click.
