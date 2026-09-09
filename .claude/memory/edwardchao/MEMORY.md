# Memory index

One line per persistent memory file, e.g.:
- [Phase 1 foundation: end-to-end verification](persistent/phase-1-foundation.md) — Task 14 sign-off: test/lint/full-flow results, missing `apps/web` ESLint config found and fixed, and a wording bug in the task-14 brief's step 4.8.
- [Availability Ping: end-to-end verification](persistent/availability-ping.md) — Task 7 sign-off on the `availability-ping` branch: real 2-user notification delivery confirmed against Postgres, plus five real bugs/gotchas found and fixed (middleware blocking `/sw.js`, an unguarded push-subscription call, a TS lib.dom cast, a `.next` cache corruption from concurrent build+dev, and a Colima restart red herring). Push delivery itself couldn't be visually confirmed — this tool's browser pane blocks Service Worker registration entirely.
