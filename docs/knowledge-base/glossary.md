# Glossary

Spont-specific terms, defined in plain language first. This grows as
later phases introduce new concepts — add to it rather than letting a
new term's meaning live only in one spec.

**Flake score** — a number showing how reliably a friend actually shows
up to hangouts they said yes to (as opposed to accepting and then
bailing). Higher is more reliable. Not built yet as a real feature — it
exists so far only in the home-feed design mockup as a design target.

**Universal label** — a small, shared set of categories (like "Work,"
"Family," "Social") that everyone's personal calendar labels get sorted
into, so the app can compare schedules across people whose own labels
("Gym," "Client Call," "Date Night") are all different. Not built yet —
planned for a later phase.

**Free/busy** — knowing *whether* someone is available at a given time,
without seeing *what* they're doing. Spont is designed to only ever see
free/busy status from a connected calendar, never event titles or
details.

**Mock calendar provider** — the current stand-in for a real Google
Calendar connection. It uses realistic fake data (5 test users, each
with sample calendar events) instead of connecting to anyone's real
calendar. See `architecture.md` for why this exists.

**`CalendarProvider`** — the technical interface (a contract in code)
that both the mock calendar and, later, a real Google Calendar
connection will implement identically, so nothing else in the app needs
to know or care which one is actually in use.

**`AppError`** — the one way business-rule violations (like "you already
sent this person a friend request") get signaled in this codebase's
rulebook layer (`packages/core`). Every one carries a short code (like
`FRIENDSHIP_EXISTS`) that the website layer translates into the right
kind of error message.

**Phase** — a chunk of planned work, each with its own design document
under `docs/superpowers/specs/` and implementation plan under
`docs/superpowers/plans/`. Phase 1 (Foundation) is complete; later
phases (label taxonomy, the actual scheduling engine, real calendar
write-back, notifications, and the "flake score" feature) haven't been
built yet.
