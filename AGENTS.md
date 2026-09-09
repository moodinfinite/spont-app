# Working on Spont

- Canonical repository: `moodinfinite/spont-app`; base new work on `main`.
- Read `README.md` and `docs/HANDOFF.md` first. Historical specs may describe
  removed UI or unmerged features. Follow current design principles for UI work.
- Run commands from the root. `apps/web` owns Next.js/OAuth and integration;
  `packages/core` owns shared rules; `packages/db` owns Prisma.
- `npm run test:unit` needs no database. `npm test` and `db:seed` delete data:
  use only disposable databases, never real user data.
- Add focused regression coverage for behavior changes, run relevant tests and
  `npm run build`, and avoid unrelated refactors.
- Preserve uncommitted work. Do not force-push main or rewrite migration history.
- Keep credentials/generated files out of commits. Do not silently expand Google
  event-detail access to accommodate older taxonomy code.
- Use new migrations for schema changes. Vercel builds do not apply migrations.
- Update `docs/HANDOFF.md` for meaningful status/setup changes. Use the PR template
  to record behavior, validation, and limitations.
- Contributor memory is optional context; keep shared facts in `docs/` so nobody
  needs a personal memory file or a specific assistant product to contribute.
