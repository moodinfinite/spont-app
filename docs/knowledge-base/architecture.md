# Architecture

Why this codebase is put together the way it is. Plain language first;
if a term needs more technical depth, that comes after, not instead of,
the plain explanation.

## The three main pieces

In plain terms: there's a website (what you see and click), a shared
"rulebook" of what's allowed to happen (like "you can't invite someone
who's already in a group"), and a database layer that actually stores
information. Keeping these three separate means a rule like "you can't
friend yourself" only has to be written once and both the website and
any future non-website surface (like a mobile app, someday) would use
the same rule.

Technically, this is an npm-workspaces monorepo with three packages:

- **`apps/web`** — the actual Next.js website: pages, API routes, login.
  This is the only piece that knows about HTTP requests, cookies, or
  what a web page looks like.
- **`packages/core`** — the rulebook. Business logic like "who can send
  a friend request," "who can respond to a group invite," with no idea
  that a website exists — it just takes plain data in and gives plain
  data (or a specific, named error) back out.
- **`packages/db`** — the database layer. The schema (what tables exist,
  what columns they have) and the connection to Postgres. `packages/core`
  uses this to actually read/write data, but the *rules* about what's
  allowed live in `packages/core`, not here.

## Why calendar access is behind an abstraction

In plain terms: the app needs to know when you're free, which eventually
means connecting to your real Google Calendar. But getting Google's
approval to do that takes time and review on Google's end. So the app
was built to work against realistic fake calendar data first, with a
clean swap-point left for when real Google Calendar access is ready —
nothing else in the app needs to change when that swap happens.

Technically: `packages/core/src/calendar-provider/types.ts` defines a
`CalendarProvider` interface (`listBusyBlocks`, `listRawLabels`,
`createEvent`). Today, only `MockCalendarProvider` implements it,
backed by seeded fake data in Postgres. A future `GoogleCalendarProvider`
implementing the same interface is the only thing that changes when real
Google Calendar integration ships — Friends, Groups, and every page in
`apps/web` are written against the interface, never the mock
implementation directly.

## Why real login/auth isn't built yet

In plain terms: real login (via your actual Google account) is also
gated behind that same Google approval process mentioned above. So for
now, logging in just means picking a name from a list of test users —
there's no password, no real account. This is intentionally temporary,
and the login page says so directly ("Dev-only picker") so nobody
mistakes it for how the real app will work.

## Where to look for "why does X exist" that isn't answered here

- `docs/superpowers/specs/` — the detailed design reasoning for each
  phase of work, written at the time that phase was planned.
- `docs/knowledge-base/references.md` — specific tooling gotchas
  (library quirks, config conflicts) discovered while building this.
