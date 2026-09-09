# Availability Ping feature — end-to-end verification (Task 7)

Verified 2026-09-08 on the `availability-ping` branch, against a fresh
Colima-backed Docker install (this machine had no Docker at all
beforehand — installed via `brew install colima docker docker-compose`,
plus a `~/.docker/config.json` `cliPluginsExtraDirs` entry so `docker
compose` resolves as a plugin).

## What was verified

- **DB reset**: `docker compose down -v && docker compose up -d`, then
  `npm run db:migrate` (both migrations replayed cleanly on the fresh
  volume — "Already in sync") and `npm run db:seed`.
- **Test suite**: `npm test` — 26 tests pass across `packages/core` (21:
  friends/groups/calendar-provider/availability-ping services) and
  `packages/db` (5: schema, seed-data, availability-ping schema).
- **Lint**: `npm run lint` — clean, no warnings or errors.
- **Full 2-user flow**, driven through a real browser (not curl) against
  a backgrounded `npm run dev`:
  - Alice creates "Close Friends," invites Bob.
  - Bob logs in, sees the invite-only view (no member list, matching the
    spec), accepts.
  - Alice logs back in, clicks "I'm free," picks the group, sends a
    message. Verified directly against Postgres (not just the UI): a
    real `AvailabilityPing` row was created, and Bob got a real
    `Notification` row (`type: 'availability_ping'`) with the correct
    sender name and message in its payload.
  - Immediately sending a second ping to the same group correctly
    returned 429 and surfaced "You already pinged this group recently"
    in the UI.
  - Separately verified the single-member no-op case (a group of just
    the sender): the ping is created, zero `Notification` rows are
    created, no error — matches the spec exactly.

## Deviations / gaps found (all fixed as part of this pass)

- **Auth middleware was redirecting `/sw.js` to `/login`.** The matcher
  only excluded `_next/static`, `_next/image`, `favicon.ico` — a service
  worker fetch needs real JS back, not an HTML redirect, or registration
  fails outright. Fixed by adding `sw.js` to the matcher's exclusion
  list in `apps/web/middleware.ts`.
- **`ensurePushSubscription()` wasn't wrapped in a try/catch** at its
  call site in `PingButton`. Any failure there (unsupported browser,
  denied permission, or — as found below — a sandboxed environment)
  threw before the compose flow ever opened, breaking the entire feature
  over what's supposed to be a best-effort push nudge. Fixed in
  `apps/web/components/ping-button.tsx`.
- **This embedded browser-automation pane cannot register service
  workers at all** — confirmed by registering a deliberately
  nonexistent path and getting the identical generic error
  ("An unknown error occurred when fetching the script.") as for the
  real, correctly-served `/sw.js`. This is a sandbox restriction in the
  tooling, not an app bug — `/sw.js` itself serves correctly (verified
  via direct `curl`/`fetch`: 200, correct `application/javascript`
  content-type, correct body). The try/catch fix above means this
  doesn't block the rest of the flow, but real push delivery (the actual
  browser permission prompt, notification click opening the app) could
  not be visually confirmed inside this tool — only the server-side half
  (the API creating pings/notifications correctly) was verified this
  way.
- **A TypeScript strictness papercut**: `PushManager.subscribe()`'s
  `applicationServerKey` rejected a plain `Uint8Array` under this
  project's TS/lib.dom versions (`ArrayBufferLike` vs `ArrayBuffer`
  variance). Fixed with an explicit `as BufferSource` cast in
  `apps/web/lib/push-client.ts` — a known ecosystem-wide issue, not a
  logic bug.
- **Running `next build` while `next dev` was also running corrupted the
  `.next` build cache** (`Cannot find module './593.js'`), causing a
  blank page after the Task 7 DB reset. Both processes write to the same
  `.next/` directory independently. Fixed by killing the dev server,
  `rm -rf apps/web/.next`, and restarting clean. Worth remembering for
  future sessions: don't run a production build and the dev server
  concurrently against the same `apps/web/.next`.
- Also hit a red herring while debugging: `docker exec spont-app-postgres-1
  psql ...` showed zero tables even though the app was working correctly.
  The actual issue was Colima's VM having a restart/suspend blip
  mid-session (visible in the container's own logs as an immediate
  shutdown+restart); the container's internal socket-based `psql` session
  was stale, while connecting from the host via the same
  `postgresql://...@localhost:5432/spont` the app itself uses showed the
  real, correct, fully-populated schema. If `docker exec` ever disagrees
  with the app's own behavior, trust a host-side connection over the
  container's own internal one.

## Net result

All automated tests pass, lint is clean, and the full ping flow — create
group, invite, accept, send, real notification delivery to a genuine
second user, rate limiting — works end to end with no unhandled server
errors. Push *delivery* itself (the literal browser notification popping
up) could not be visually confirmed due to this tool's sandbox
restriction on Service Worker registration; the code path up to and
including "the server successfully calls `WebPushSender.send()`" is
verified, but the final "does a push actually arrive" step needs
confirming in a real, non-sandboxed browser.
