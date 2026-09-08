# Putting Spont on a URL

Until this is done, Spont only exists on one laptop — collaborators can't
reach `localhost:3000` no matter what you send them. Deploying is what
turns the invite link into something that works in a group chat.

Free on Vercel's hobby tier. The database is already hosted on Neon, so
the same connection string works from your machine and from Vercel.

## 1. Import the repo

<https://vercel.com/new> → import `echao49/nba-props-agent`.

**Set Root Directory to `spont_app`.** This is the fiddly part and the
thing most likely to waste an hour: the repo root is a Python project,
the npm workspace root is `spont_app`, and the Next app is two levels
down at `spont_app/apps/web`. Point Vercel at `spont_app` and the
committed `vercel.json` handles the rest — it sets the build command,
install command and the output directory (`apps/web/.next`).

## 2. Environment variables

Add these in Vercel's project settings, not in the repo:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | The pooled string from Neon — same one in `.env.local` |
| `SESSION_SECRET` | **A fresh random value. Do not reuse the dev one.** |
| `GOOGLE_CLIENT_ID` | From the Google console |
| `GOOGLE_CLIENT_SECRET` | From the Google console |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-DOMAIN/api/auth/google/callback` |

**Generate a real session secret.** The local one is
`dev-secret-change-me`, which is published in `.env.example` in this
repo — anyone could forge a session cookie for any user against a server
using it. Any long random string works:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Tell Google about the new address

In the Google console → **Credentials** → your OAuth client, **add** the
deployed callback alongside the localhost one:

```
https://YOUR-DOMAIN/api/auth/google/callback
```

Keep localhost too, so local development still works. Miss this and
sign-in fails with `redirect_uri_mismatch`, which reads as the app being
broken rather than a setting being absent.

Then set `GOOGLE_REDIRECT_URI` on Vercel to exactly that string —
character for character, including `https`.

## 4. Add every collaborator as a Google test user

Consent screen → **Audience → Test users**. Anyone not listed is refused
outright, with no useful explanation. The app is unverified, so they will
also hit **"Google hasn't verified this app"** and need
**Advanced → Go to Spont (unsafe)**.

Warn them in the same message as the invite link, or you'll lose people
at the door for reasons that have nothing to do with whether Spont works.

## 5. Migrations

`npm run db:migrate` from your machine already changed the shared Neon
database, so the deployed app sees the same schema. There is no separate
production database yet.

**That means a bad migration takes down whatever your collaborators are
using.** Worth a second Neon branch for production before the testing
gets serious.

## Known limits

- **Refresh tokens are stored unencrypted.** Fine for an allowlist of
  people you know; not fine beyond that.
- **One database for local and deployed.** See above.
- **Testing-mode refresh tokens expire in about a week**, so a longer
  test means everyone reconnecting — unless the app is published, which
  the narrow scopes should make straightforward.
