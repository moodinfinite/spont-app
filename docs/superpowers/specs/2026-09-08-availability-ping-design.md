# Spont App — Availability Ping Feature Design

Status: Approved for implementation planning
Date: 2026-09-08

## Summary

A one-tap way to tell a chosen group of friends "I'm free" right now (or
for a window of time), with an optional message, delivered as a real
push notification. This is intentionally a lightweight, one-way
heads-up — no accept/decline structure, no dependency on the scheduling/
proposal system currently being built on a separate branch. It reuses
the app's existing Group/GroupMembership feature as the audience
mechanism, and the existing (currently unused) `Notification` table as
the delivery/inbox mechanism, so the only new schema is the ping itself
and push-subscription storage.

## Why this exists

Spont's existing surfaces (Friends, Groups, and the in-progress
scheduling engine on another branch) are all about *planning* a
hangout. This feature is the opposite motion: a spontaneous, low-effort
signal — "I'm around" — sent to a group you already trust, with no
commitment implied on either side. It's deliberately decoupled from the
Proposal system so it doesn't have to wait on or interfere with that
work, but the data it captures (sender, audience, time window) is
structured so a later phase could use a ping to seed a real Proposal
without a schema change.

## Data model

Two new tables. Everything else — `Group`, `GroupMembership`,
`Friendship`, `Notification` — is reused unchanged.

```prisma
model AvailabilityPing {
  id         String    @id @default(cuid())
  senderId   String
  groupId    String
  message    String?
  windowStart DateTime @default(now())
  windowEnd  DateTime?
  createdAt  DateTime  @default(now())

  sender User  @relation(fields: [senderId], references: [id])
  group  Group @relation(fields: [groupId], references: [id])
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

- `AvailabilityPing` holds the canonical content once per send — not
  duplicated per recipient.
- `windowStart` defaults to "now"; `windowEnd` is nullable, covering the
  optional "for the next 2 hours" case. A ping with no `windowEnd` is
  open-ended.
- `PushSubscription` is one row per browser/device a user has granted
  push permission on — a user can have several (phone, laptop, etc.).
- No changes to `Group`/`GroupMembership`: a ping's audience is simply
  "every other user with an `ACCEPTED` `GroupMembership` in `groupId`."
  A user can belong to and ping any group they're an accepted member of
  — not limited to groups they created.

### Delivery via the existing `Notification` table

Sending a ping fans out one `Notification` row per recipient:

```
type: 'availability_ping'
payload: { pingId, senderId, senderName, groupId, groupName, message, windowStart, windowEnd }
```

This table was created in Phase 1 as an empty shell for exactly this
purpose and has never been used. Reusing it means: no new inbox
storage, and read-tracking for free via the existing `Notification.readAt`.

## Sending flow

1. User taps the availability button (visual placement/design not yet
   decided — see Deferred, below).
2. If they belong to more than one group, a lightweight picker shows
   each group's name and member count; a single group skips straight to
   step 3. Zero groups → prompted to create one first.
3. Compose: optional free-text message, optional "for the next N hours"
   control (defaults to open-ended).
4. On send:
   a. Create one `AvailabilityPing` row.
   b. Create one `Notification` row for every other `ACCEPTED` member of
      that group.
   c. Send a real push to every `PushSubscription` belonging to each of
      those recipients.
5. Tapping the resulting push notification opens the app at a
   placeholder route (`/`, the home page) — the real destination is an
   explicitly open decision (see Deferred).

If the group has no other accepted members (a group of one), the send
still succeeds — it's a no-op for delivery purposes, not an error.

### Rate limiting

A per-sender, per-group cooldown: `sendAvailabilityPing` checks for an
existing `AvailabilityPing` from the same `senderId`/`groupId` within
the last 15 minutes and throws `AppError('RATE_LIMITED', ...)` if one
exists. A single query against the table already being written to —
no new table, no background job.

## Push delivery mechanics

Standard Web Push, since there is no native app to hook into:

- A VAPID keypair, generated once, stored as env vars (public key also
  shipped to the client).
- A service worker (`apps/web/public/sw.js`) handling the `push` event
  (render a `Notification` from the payload) and `notificationclick`
  (focus or open the app at the payload's URL).
- Client-side: request `Notification` permission the first time the
  user actually tries to use the feature (not on page load), then
  `PushManager.subscribe()` with the VAPID public key, and `POST` the
  resulting subscription to the backend.
- Server-side: the `web-push` npm package sends the actual payload to
  each stored subscription. A subscription that comes back 404/410
  (expired/revoked) gets deleted.

Push sending is abstracted behind a small interface, mirroring the
existing `CalendarProvider` pattern:

```ts
interface PushSender {
  send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<void>
}
```

The real implementation wraps `web-push`; tests use a no-op/mock
implementation so `packages/core` tests never make real network calls.
A push failure for one or more recipients is logged and does not fail
the overall send — the `Notification` row is the source of truth, push
is a best-effort nudge on top of it.

## API surface

- `POST /api/pings` — body `{ groupId, message?, windowEnd? }`. Creates
  the ping, fans out notifications, triggers push. `NOT_AUTHORIZED` if
  the sender isn't an accepted member of `groupId`. `RATE_LIMITED` if
  the sender has already pinged this `groupId` within the cooldown
  window (see Rate limiting, below).
- `POST /api/push/subscribe` — stores a `PushSubscription` for the
  current user.
- `DELETE /api/push/subscribe` — removes a subscription (e.g. on
  logout or permission revocation).
- `GET /api/groups` — already exists; reused to populate the group
  picker.

Errors use the existing app-wide shape, `{ error: { code, message } }`.

## Testing

- `packages/core` unit tests for ping creation + notification fan-out,
  using a mock `PushSender` — same pattern as the existing
  Friends/Groups service tests.
- Schema tests for `AvailabilityPing` and `PushSubscription`, matching
  the existing `schema.test.ts` pattern.

## Deferred / explicitly out of scope

- **Button placement and visual design** — not decided. Handed to the
  collaborator working on the visual design system to place in context
  of the current app shell (note: that branch removed the notifications
  feature entirely, so where a received ping surfaces in-app needs
  resolving alongside the button itself, not as an afterthought).
- **Where a tapped push notification navigates to** — defaults to the
  home page for now; the real destination is unresolved by design (the
  user hasn't decided which part of the app it should open to).
- **Any integration with the Proposal/scheduling system** — deliberately
  not built now. The ping's shape (sender, group, time window) is meant
  to be sufficient for a future function to turn a ping into a real
  Proposal, without needing a schema change to do it.
- **Automatic staleness/expiry** — a ping whose `windowEnd` has passed
  just sits there; there's no job that marks it stale or hides it from
  anything. Deferred with a specific revisit trigger: build this only
  once a ping-history or "active pings" view exists — there is no such
  UI in this spec, so there's currently nothing for staleness to affect.
- **Multi-device subscription cleanup** — logging out doesn't remove
  that device's `PushSubscription`; it fails silently (404/410) and gets
  pruned lazily on next send. This is an accepted permanent trade-off,
  not a backlog item — revisit only if push failure *rates* become
  noticeable enough to matter for observability or cost.

Rate limiting/spam prevention is **no longer deferred** — see "Rate
limiting" above; it's cheap enough to build into the initial
implementation rather than punt on.
