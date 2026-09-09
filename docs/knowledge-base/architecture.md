# Architecture

Spont has a Next.js website, shared business rules, and Postgres.
See [the handoff](../HANDOFF.md) for current status and next work.

## Ownership

- `apps/web`: pages, React components, API routes, sessions, Google OAuth,
  free/busy requests, suggestion orchestration, and proposal persistence.
- `packages/core`: scheduling helpers, proposal rules, friends/groups services,
  calendar-provider types, and the mock provider. Pure helpers need no database;
  services accept a Prisma client.
- `packages/db`: Prisma schema, migrations, client, test fixtures, and seed data.

Run npm workspace commands from the repository root. Next.js transpiles the
shared TypeScript packages through `apps/web/next.config.js`.

## Current flow

1. `/welcome` starts Google OAuth. The callback identifies users by Google's
   subject, stores calendar tokens, and creates a signed session.
2. `/connected` collects preferences and offers an invite link.
3. Home calls `lib/propose.ts` when the viewer has accepted friends.
4. `lib/availability.ts` dispatches to `lib/google-calendar.ts` for Google accounts
   or stored events for mock accounts. Google reads primary-calendar free/busy,
   not event titles or descriptions.
5. `lib/proposals.ts` builds feed data. The response API applies core rules and
   stores participant/proposal state in a database transaction.

Generation runs during Home requests, not in a scheduled worker. Accepting a
proposal does not yet create or remove events on Google Calendar.

## Calendar boundary

`packages/core/src/calendar-provider/types.ts` defines an interface implemented
by `MockCalendarProvider`. Real Google integration currently lives in
`apps/web/lib` and does not implement that interface. The mock's `createEvent`
method does not mean real calendar writing is complete.

Google scopes request identity, free/busy, and access to calendars the app creates.
Integrating the older taxonomy branch must not silently broaden event-detail
access or change the app's privacy promise.

## Sources of truth

Current code and [HANDOFF.md](../HANDOFF.md) describe implemented behavior. Dated
specs and mockups preserve historical plans; not every feature they describe is
implemented or integrated into main.
