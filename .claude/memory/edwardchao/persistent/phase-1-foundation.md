# Phase 1 (Foundation) — end-to-end verification (Task 14)

Verified 2026-09-06 against a local Postgres instance (no Docker in this
sandbox; `DATABASE_URL` in `spont_app/.env` pointed at an already-running
local Postgres used throughout all 14 tasks).

## What was verified

- **DB reset**: `npm run db:migrate` (no pending migrations) then
  `npm run db:seed`. The seed script calls `resetDb()` before seeding, so it
  gives an equivalent "known clean state" to `docker compose down -v && up`
  without needing Docker. Produced 5 users (Alice, Bob, Carol, Dave, Erin),
  each with a mock calendar account and 5 events.
- **Test suite**: `npm test` — 19 tests pass across `packages/core`
  (16: friends service, groups service, mock calendar provider) and
  `packages/db` (3: schema, seed-data).
- **Lint**: `npm run lint` now passes clean ("No ESLint warnings or
  errors") after fixing a gap described below.
- **Full 3-user flow**, driven via `curl` with per-user cookie jars against
  a backgrounded `npm run dev` (localhost:3000), rather than a browser:
  - `/` redirects unauthenticated requests to `/login` (307).
  - Alice logs in, sends a friend request to Bob (`POST /api/friends`).
  - Bob's `/friends` page renders the incoming request from Alice; Bob
    accepts it (`PATCH /api/friends/:id`), status flips to ACCEPTED.
  - Bob creates "Test Group" (`POST /api/groups`) and invites Carol
    (`POST /api/groups/:id/members`) — invite succeeds even though Carol
    and Bob aren't friends yet, confirming group invites don't require an
    existing friendship.
  - Carol logs in, opens the group URL, sees the invite prompt, accepts
    (`PATCH /api/groups/members/:membershipId`).
  - Both Bob's and Carol's `/groups` list pages show "Test Group"; Bob's
    group detail page shows both memberships as ACCEPTED.
  - `/notifications` and `/settings` render 200 for all three users.
  - Logout (`POST /api/auth/logout`) clears the session; a subsequent
    request to `/friends` correctly redirects to `/login`.
  - The `npm run dev` server log showed no unhandled exceptions or stack
    traces for the whole walkthrough.

## Deviations / gaps found

- **Brief's Step 4.8 names the wrong user.** It says "the group detail
  page for Alice shows both as accepted members," but Alice was never
  invited to "Test Group" (only Bob and Carol were). Confirmed the app's
  access control is actually correct here: Alice hitting
  `/groups/:id` for a group she's not a member of gets a 404
  (`apps/web/app/groups/[id]/page.tsx` calls `notFound()` when no
  membership row exists). The intended assertion — both members show
  ACCEPTED — was verified from Bob's (the group creator's) view instead.
  Treat this as a wording bug in the task-14 brief, not an app bug.
- **`apps/web` had no ESLint config at all**, so `next lint` (invoked by
  the root `npm run lint`) dropped into an interactive "How would you like
  to configure ESLint?" prompt and failed non-interactively. This must
  have been missed when the Next.js app was scaffolded (Task 9). Fixed by
  adding `apps/web/.eslintrc.json` with `{"extends": "next/core-web-vitals"}`
  (the same config the "Strict (recommended)" prompt option would have
  generated). After adding it, lint runs clean with no warnings or errors.
- No Docker in this sandbox — used a pre-existing local Postgres instance
  matching `.env` instead of `docker compose`, per the environment note
  established across prior tasks. The seed script's own `resetDb()` call
  gave an equivalent clean-slate guarantee.

## Net result

All of Phase 1's automated tests pass, lint is clean, and the full
friends → groups → invite-accept flow works end to end across three
concurrent user sessions with no server-side errors. The one real gap
found (missing ESLint config) has been fixed as part of this pass.
