# Collaborator handoff

Baseline: September 2026 migration to `moodinfinite/spont-app`. Update this document
when a PR changes what someone picking up the app needs to know.

## Where to work

Use **main** in this repository. It contains the rounded/green app and the existing
main-branch work, including the Availability Ping spec. The old repositories are
historical sources, not the destination for new work.

| Branch | Status | Use |
| --- | --- | --- |
| `main` | Integrated app and current handoff | Base new branches and PRs here |
| `design/rounded-green-direction` | Merged into main; preserved | Historical reference |
| `availability-ping` | Implemented separately, not merged | Ping service, Web Push, APIs, minimal UI, placement mockup; reconcile before integration |
| `phase-2-label-taxonomy` | Implemented separately, not merged | Labels, privacy controls, schedule views; reconcile with current Google access and UI |

All these branches retain their app history. Old pull-request discussions remain
in the source repositories. Preserving a branch does not mean it is compatible
with current main or ready to merge unchanged.

## Current product

The target is one real friend group. Optimize for arranging and attending actual
hangouts with little time in the app. Rounded cards, green actions, light/dark
themes, and the floating dock are the current design direction.

| Area | Implemented on main | Remaining limits |
| --- | --- | --- |
| Sign-in | Google OAuth, signed sessions, calendar token storage/refresh | No dev-user picker; signed-in testing needs OAuth access |
| Onboarding | Hangout preferences and friend invite links | Returning OAuth logins still go through `/connected`; `onboardedAt` does not skip the flow |
| People | Friend requests, groups, membership invites, minimum group attendance setting | Friendship and membership are separate; Home only starts matching when the viewer has an accepted friend |
| Calendar | Primary Google calendar free/busy; mock provider for tests | No secondary-calendar selection, timezone setting, or reliable reconnect status |
| Suggestions | Saved proposals generated on Home load; 30-day horizon; preferred/never time buckets; soonest/best choice; quarter-hour rounding | No daily background job; correctness concerns below |
| Responses | Per-person accept/decline, waiting/confirmed Upcoming state, short Undo UI | No Google event creation/removal; no Upcoming withdrawal control |
| Manual hangout | `/new` lists friends | Person/time selection and sending are unfinished |
| Notifications | Home/People pending-item dots | No external delivery/inbox on main; Web Push exists on the unmerged ping branch |

**Recent changes to remember:** the matcher now reads saved hangout-time
preferences. The daily cap was removed; proposals are bounded by relationship.
Earlier reviews and copy referring to ignored preferences or a two-per-day cap
predate the latest design work.

## Suggested next tasks

These are proposed slices, not already assigned tasks. Choose one in your PR.

### 1. Complete the hangout lifecycle

Start with `apps/web/app/new/page.tsx`, `apps/web/app/api/proposals/[id]/route.ts`,
`apps/web/components/proposal-card.tsx`, and `packages/core/src/proposals/rules.ts`.

Done when a tester can choose people and an available time, send a proposal, see
who accepted, and withdraw from Upcoming. Confirmed attendees should receive a
real event on a Spont-created Google calendar, with duplicate-safe retries and
appropriate removal when someone withdraws or the plan falls through.

Resolve these before wiring calendar writes:

- Acceptance currently persists immediately; Undo sends a decline. The five-second
  ring is not a server-side delay and does not restore a pending response.
- `Group.minAttendees` controls generation, but response rules still hardcode
  `GROUP_QUORUM = 2`. Decide whether proposals snapshot the required attendance so
  later group-setting changes do not alter existing commitments unexpectedly.

### 2. Make matching dependable

Start with `apps/web/lib/propose.ts`, `apps/web/lib/google-calendar.ts`, and
`packages/core/src/scheduling/`. Add focused regression coverage around these
current implementation concerns:

- Only the start of each long free window is tried. Rejecting that start for its
  hour or preference bucket can miss usable times later in the same window.
- Buckets, day boundaries, and labels use server-local time, which may differ
  from testers' timezone after deployment.
- Group preferences/durations include people outside the selected window.
  A group candidate can also omit the viewer whose page generated it.
- Existing-plan collision checks cover the viewer, not every participant;
  concurrent loads/responses can race when creating or confirming proposals.
- Only Google's `primary` calendar is read. A per-calendar error inside a
  successful free/busy response can currently look like an empty busy list.

Done when suggestions consistently respect the actual participants' availability,
preferences, and existing plans, with a clear reconnect state when access fails.

### 3. Notify people without requiring a Home visit

Review `availability-ping` and
`docs/superpowers/specs/2026-09-08-availability-ping-design.md` before rebuilding
its work. That branch implements a manual "I'm free" ping, not scheduled matching.

A daily scan plus email is one small proposal-notification path; Web Push code
exists on the ping branch if that channel is chosen. Deduplicate delivery, limit
interruptions, and surface confirmations/cancellations. Done when friends can
learn about and respond to a proposal without the organizer reminding them.

**Integration conflict:** ping code expects `Notification`, which main deliberately
removed. Decide where received pings appear in the current app before bringing
back schema or inbox UI. Label taxonomy similarly assumes more event detail than
current free/busy-only Google access provides; review that privacy change explicitly.

## Validation and environments

- The integrated app passed a production build and 55 database-free tests before
  this handoff. Two existing hook-dependency warnings remain in
  `apps/web/app/friends/friends-client.tsx`.
- CI applies all migrations, runs the full suite on disposable Postgres, and
  builds. Check the Actions result; a passing build does not prove real OAuth or
  multi-user calendar behavior.
- Calendar writing and external notifications are not implemented on main. Live
  Google/multi-user smoke testing is separate from unit and database tests.
- `npm test` and `db:seed` delete data. Use disposable databases only; do not share
  their target with development sign-in sessions or the live friends test.
- Vercel builds generate Prisma's client but do not apply migrations. Follow
  [the deployment guide](setup-deploy.md).
- Obtain credentials privately from the maintainer. Public source does not make
  the live database, calendar tokens, or test accounts public.

## First contribution

1. Follow [README](../README.md) and run `npm run test:unit`.
2. Branch from current main and describe one user-visible outcome in the PR.
3. Read the relevant source above and current design principles.
4. Test changed behavior; use a disposable database for service/schema tests and
   screenshots for UI changes.
5. Update this handoff when a gap closes and state what remains unverified.
