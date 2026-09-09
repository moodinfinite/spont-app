# Availability Ping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user one-tap broadcast "I'm free" (with an optional message and optional time window) to one of their existing Groups, delivered to every other accepted member as a real push notification.

**Architecture:** Two new Postgres tables (`AvailabilityPing`, `PushSubscription`); a `packages/core` service function that enforces membership + a rate-limit cooldown, creates the ping, and fans out to the existing (currently unused) `Notification` table; push delivery goes through a small `PushSender` interface (mirroring the existing `CalendarProvider` pattern) so core tests never make real network calls, with the real Web Push implementation living in `apps/web`. UI is intentionally minimal/unstyled — button placement and visual design are explicitly deferred to a collaborator's separate design pass; this plan wires the feature end-to-end, not how it looks.

**Tech Stack:** Same as the rest of the app (TypeScript strict, Prisma/Postgres, Next.js 14 App Router, Vitest), plus the `web-push` npm package for actual push delivery and a plain-JS service worker.

**Spec:** `docs/superpowers/specs/2026-09-08-availability-ping-design.md`

## Global Constraints

- TypeScript `strict: true`, matching every existing package.
- API error responses always use `{ error: { code: string, message: string } }`, via `apps/web/lib/api-error.ts`'s `toErrorResponse`.
- Tests run against real Postgres (no SQLite/mocks for the database itself) — `resetDb()` must be updated wherever new tables are added.
- `apps/web` has no automated test runner in this codebase (no `test` script, no Vitest config) — every `apps/web` task is verified by `npm run build --workspace apps/web` plus a manual walkthrough, matching how Tasks 8–13 of the foundation plan were verified. Only `packages/core` and `packages/db` get TDD unit tests.
- Do not touch `phase-2-label-taxonomy` or `design/rounded-green-direction` — those are collaborator-owned branches. All work in this plan happens on `main` (or a new branch off `main`).
- Push sending must go through the `PushSender` interface — never call `web-push` directly from `packages/core`, and never let a push failure raise out of `sendAvailabilityPing`.

---

## Task 1: `packages/db` — schema for AvailabilityPing and PushSubscription

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Modify: `packages/db/src/test-utils.ts`
- Test: `packages/db/src/availability-ping-schema.test.ts`

**Interfaces:**
- Consumes: nothing new — extends the existing `User` and `Group` models.
- Produces: Prisma model types `AvailabilityPing` and `PushSubscription`, re-exported from `@spont/db` via the existing `export * from '@prisma/client'` in `packages/db/src/index.ts` (no change needed there). Used by every later task in this plan.

- [ ] **Step 1: Add the two new models to `packages/db/prisma/schema.prisma`**

Add these two models anywhere after the existing `Notification` model:

```prisma
model AvailabilityPing {
  id          String    @id @default(cuid())
  senderId    String
  groupId     String
  message     String?
  windowStart DateTime  @default(now())
  windowEnd   DateTime?
  createdAt   DateTime  @default(now())

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

Then add the back-relation fields. On `model User`, add these two lines alongside the existing relation fields (e.g. after `notifications Notification[]`):

```prisma
  sentAvailabilityPings AvailabilityPing[]
  pushSubscriptions     PushSubscription[]
```

On `model Group`, add this line alongside the existing `members GroupMembership[]`:

```prisma
  availabilityPings AvailabilityPing[]
```

- [ ] **Step 2: Run the migration**

Run: `npm run migrate --workspace packages/db -- --name add_availability_ping`
Expected: Prisma generates a new migration under `packages/db/prisma/migrations/`, applies it, and regenerates the client with no errors. (Assumes Postgres is already running via `docker compose up -d`.)

- [ ] **Step 3: Update `resetDb()` in `packages/db/src/test-utils.ts`**

Add these two lines at the top of the function, before the existing `notification.deleteMany()` call (order matters: both new tables reference `User`/`Group`, so they must be cleared before those):

```ts
export async function resetDb(): Promise<void> {
  await prisma.pushSubscription.deleteMany()
  await prisma.availabilityPing.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.groupMembership.deleteMany()
  await prisma.group.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.calendarEvent.deleteMany()
  await prisma.calendarAccount.deleteMany()
  await prisma.user.deleteMany()
}
```

- [ ] **Step 4: Write the failing test — `packages/db/src/availability-ping-schema.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from './index'

describe('AvailabilityPing and PushSubscription schema', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('creates and reads back an AvailabilityPing with its relations', async () => {
    const alice = await prisma.user.create({ data: { name: 'Alice', email: 'alice@example.com' } })
    const group = await prisma.group.create({ data: { name: 'Close Friends', ownerId: alice.id } })

    const ping = await prisma.availabilityPing.create({
      data: { senderId: alice.id, groupId: group.id, message: "who's around?" },
    })

    const found = await prisma.availabilityPing.findUniqueOrThrow({ where: { id: ping.id } })
    expect(found.message).toBe("who's around?")
    expect(found.windowEnd).toBeNull()
    expect(found.windowStart).toBeInstanceOf(Date)
  })

  it('creates a PushSubscription and enforces a unique endpoint', async () => {
    const alice = await prisma.user.create({ data: { name: 'Alice', email: 'alice@example.com' } })

    await prisma.pushSubscription.create({
      data: { userId: alice.id, endpoint: 'https://push.example/alice', p256dh: 'key', auth: 'auth' },
    })

    await expect(
      prisma.pushSubscription.create({
        data: { userId: alice.id, endpoint: 'https://push.example/alice', p256dh: 'key2', auth: 'auth2' },
      }),
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test --workspace packages/db`
Expected: PASS (this is confirming the schema/migration is correct, not doing red-green TDD on generated Prisma code — there's no "fails first" step here since there's no hand-written logic yet).

- [ ] **Step 6: Commit**

```bash
git add packages/db
git commit -m "feat(db): add AvailabilityPing and PushSubscription schema"
```

---

## Task 2: `packages/core` — PushSender interface and the sendAvailabilityPing service

**Files:**
- Create: `packages/core/src/availability-ping/types.ts`
- Create: `packages/core/src/availability-ping/service.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/availability-ping/service.test.ts`

**Interfaces:**
- Consumes: `AppError` (existing), `prisma`/`resetDb`/`PrismaClient`/`AvailabilityPing` types from `@spont/db` (Task 1).
- Produces: `PushSubscriptionRecord`, `PushPayload`, `PushSender` interface, and `sendAvailabilityPing(prisma, pushSender, senderId, groupId, message?, windowEnd?): Promise<AvailabilityPing>` — all exported from `@spont/core`. Used by `apps/web`'s `/api/pings` route (Task 5) and its real `WebPushSender` (Task 3).

- [ ] **Step 1: Create `packages/core/src/availability-ping/types.ts`**

```ts
export interface PushSubscriptionRecord {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title: string
  body: string
  url: string
}

export interface PushSender {
  send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<void>
}
```

- [ ] **Step 2: Write the failing tests — `packages/core/src/availability-ping/service.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { AppError } from '../errors'
import { sendAvailabilityPing } from './service'
import type { PushSender, PushSubscriptionRecord, PushPayload } from './types'

class RecordingPushSender implements PushSender {
  sent: { subscription: PushSubscriptionRecord; payload: PushPayload }[] = []
  async send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<void> {
    this.sent.push({ subscription, payload })
  }
}

class FailingPushSender implements PushSender {
  async send(): Promise<void> {
    throw new Error('network error')
  }
}

describe('sendAvailabilityPing', () => {
  beforeEach(async () => {
    await resetDb()
  })

  async function makeUser(name: string) {
    return prisma.user.create({ data: { name, email: `${name.toLowerCase()}@example.com` } })
  }

  async function makeGroupWithMembers(ownerId: string, memberIds: string[]) {
    return prisma.group.create({
      data: {
        name: 'Close Friends',
        ownerId,
        members: {
          create: [
            { userId: ownerId, status: 'ACCEPTED', role: 'OWNER' },
            ...memberIds.map((userId) => ({ userId, status: 'ACCEPTED' as const, role: 'MEMBER' as const })),
          ],
        },
      },
    })
  }

  it('creates a ping and notifies every other accepted member', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const carol = await makeUser('Carol')
    const group = await makeGroupWithMembers(alice.id, [bob.id, carol.id])

    const ping = await sendAvailabilityPing(prisma, new RecordingPushSender(), alice.id, group.id, "who's around?")

    expect(ping.senderId).toBe(alice.id)
    expect(ping.message).toBe("who's around?")

    const notifications = await prisma.notification.findMany({ where: { type: 'availability_ping' } })
    expect(notifications.map((n) => n.userId).sort()).toEqual([bob.id, carol.id].sort())
  })

  it('rejects a ping from someone not an accepted member of the group', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await makeGroupWithMembers(alice.id, [])

    await expect(
      sendAvailabilityPing(prisma, new RecordingPushSender(), bob.id, group.id),
    ).rejects.toThrow(AppError)
  })

  it('rejects a second ping to the same group within the cooldown window', async () => {
    const alice = await makeUser('Alice')
    const group = await makeGroupWithMembers(alice.id, [])
    const pushSender = new RecordingPushSender()
    await sendAvailabilityPing(prisma, pushSender, alice.id, group.id)

    await expect(sendAvailabilityPing(prisma, pushSender, alice.id, group.id)).rejects.toThrow(AppError)
  })

  it('sends a push to every registered device of each recipient', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await makeGroupWithMembers(alice.id, [bob.id])
    await prisma.pushSubscription.createMany({
      data: [
        { userId: bob.id, endpoint: 'https://push.example/bob-phone', p256dh: 'key1', auth: 'auth1' },
        { userId: bob.id, endpoint: 'https://push.example/bob-laptop', p256dh: 'key2', auth: 'auth2' },
      ],
    })

    const pushSender = new RecordingPushSender()
    await sendAvailabilityPing(prisma, pushSender, alice.id, group.id)

    expect(pushSender.sent.map((s) => s.subscription.endpoint).sort()).toEqual([
      'https://push.example/bob-laptop',
      'https://push.example/bob-phone',
    ])
  })

  it('does not let a push delivery failure stop the ping from succeeding', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await makeGroupWithMembers(alice.id, [bob.id])
    await prisma.pushSubscription.create({
      data: { userId: bob.id, endpoint: 'https://push.example/bob', p256dh: 'key', auth: 'auth' },
    })

    const ping = await sendAvailabilityPing(prisma, new FailingPushSender(), alice.id, group.id)

    expect(ping).toBeDefined()
    const notifications = await prisma.notification.findMany({ where: { type: 'availability_ping' } })
    expect(notifications).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test --workspace packages/core`
Expected: FAIL — `service.ts` (and `sendAvailabilityPing`) don't exist yet.

- [ ] **Step 4: Implement `packages/core/src/availability-ping/service.ts`**

```ts
import type { PrismaClient, AvailabilityPing } from '@spont/db'
import { AppError } from '../errors'
import type { PushSender } from './types'

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

export async function sendAvailabilityPing(
  prisma: PrismaClient,
  pushSender: PushSender,
  senderId: string,
  groupId: string,
  message?: string,
  windowEnd?: Date,
): Promise<AvailabilityPing> {
  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId: senderId } },
  })
  if (!membership || membership.status !== 'ACCEPTED') {
    throw new AppError('NOT_AUTHORIZED', 'You are not a member of this group')
  }

  const recentPing = await prisma.availabilityPing.findFirst({
    where: {
      senderId,
      groupId,
      createdAt: { gt: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    },
  })
  if (recentPing) {
    throw new AppError('RATE_LIMITED', 'You already pinged this group recently')
  }

  const sender = await prisma.user.findUniqueOrThrow({ where: { id: senderId } })
  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } })
  const ping = await prisma.availabilityPing.create({
    data: { senderId, groupId, message, windowEnd },
  })

  const recipients = await prisma.groupMembership.findMany({
    where: { groupId, status: 'ACCEPTED', userId: { not: senderId } },
    include: { user: { include: { pushSubscriptions: true } } },
  })

  for (const recipient of recipients) {
    await prisma.notification.create({
      data: {
        userId: recipient.userId,
        type: 'availability_ping',
        payload: {
          pingId: ping.id,
          senderId: sender.id,
          senderName: sender.name,
          groupId: group.id,
          groupName: group.name,
          message: ping.message,
          windowStart: ping.windowStart.toISOString(),
          windowEnd: ping.windowEnd ? ping.windowEnd.toISOString() : null,
        },
      },
    })

    for (const sub of recipient.user.pushSubscriptions) {
      try {
        await pushSender.send(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title: `${sender.name} is free`, body: ping.message ?? 'Ping them back!', url: '/' },
        )
      } catch (err) {
        console.error('Push delivery failed', err)
      }
    }
  }

  return ping
}
```

- [ ] **Step 5: Create `packages/core/src/availability-ping/types.ts` re-export in `packages/core/src/index.ts`**

Add these two lines alongside the existing exports:
```ts
export * from './availability-ping/types'
export * from './availability-ping/service'
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test --workspace packages/core`
Expected: all 5 new tests PASS, plus every existing test still passes.

- [ ] **Step 7: Commit**

```bash
git add packages/core
git commit -m "feat(core): add PushSender interface and sendAvailabilityPing service"
```

---

## Task 3: `apps/web` — real Web Push sending (WebPushSender)

**Files:**
- Modify: `apps/web/package.json`
- Modify: `.env.example`
- Create: `apps/web/lib/push-sender.ts`

**Interfaces:**
- Consumes: `PushSender`, `PushSubscriptionRecord`, `PushPayload` from `@spont/core` (Task 2); `prisma` from `@spont/db`.
- Produces: `WebPushSender` (a class implementing `PushSender`), exported from `apps/web/lib/push-sender.ts` — used by the `/api/pings` route (Task 5).

- [ ] **Step 1: Add dependencies to `apps/web/package.json`**

Add to `"dependencies"`:
```json
    "web-push": "^3.6.7"
```

Add to `"devDependencies"`:
```json
    "@types/web-push": "^3.6.3"
```

- [ ] **Step 2: Generate a VAPID keypair and document it in `.env.example`**

Run: `npx web-push generate-vapid-keys`
This prints a public and private key. Do **not** commit real keys — add placeholders to `.env.example`:

```
VAPID_PUBLIC_KEY="replace-with-a-real-vapid-public-key"
VAPID_PRIVATE_KEY="replace-with-a-real-vapid-private-key"
```

Then add the real generated values to your local `.env` (not committed).

- [ ] **Step 3: Create `apps/web/lib/push-sender.ts`**

```ts
import webpush from 'web-push'
import { prisma } from '@spont/db'
import type { PushSender, PushSubscriptionRecord, PushPayload } from '@spont/core'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:support@spont.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export class WebPushSender implements PushSender {
  async send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<void> {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
      )
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.deleteMany({ where: { endpoint: subscription.endpoint } })
      }
      throw err
    }
  }
}
```

- [ ] **Step 4: Install dependencies and verify the build**

Run: `npm install && npm run build --workspace apps/web`
Expected: build succeeds. (`WebPushSender` isn't wired into a route yet, so this is only confirming it type-checks and compiles — see Task 5 for where it's actually used.)

- [ ] **Step 5: Commit**

```bash
git add apps/web package-lock.json .env.example
git commit -m "feat(web): add WebPushSender for real push delivery"
```

---

## Task 4: `apps/web` — push subscription plumbing (service worker + client + API routes)

**Files:**
- Create: `apps/web/public/sw.js`
- Create: `apps/web/lib/push-client.ts`
- Create: `apps/web/app/api/push/vapid-public-key/route.ts`
- Create: `apps/web/app/api/push/subscribe/route.ts`

**Interfaces:**
- Consumes: `getCurrentUserId` (existing), `prisma` from `@spont/db`.
- Produces: `ensurePushSubscription(): Promise<void>` from `apps/web/lib/push-client.ts` — used by the ping UI (Task 6). `GET /api/push/vapid-public-key` and `POST /api/push/subscribe` — called by `ensurePushSubscription`.

- [ ] **Step 1: Create the service worker — `apps/web/public/sw.js`**

```js
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Spont'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    }),
  )
})
```

- [ ] **Step 2: Create `apps/web/app/api/push/vapid-public-key/route.ts`**

```ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? '' })
}
```

- [ ] **Step 3: Create `apps/web/app/api/push/subscribe/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { getCurrentUserId } from '@/lib/session'

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const body = await request.json()
  const endpoint: string = body.endpoint
  const p256dh: string = body.keys?.p256dh
  const auth: string = body.keys?.auth

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth },
    update: { userId, p256dh, auth },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { endpoint } = await request.json()
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Create `apps/web/lib/push-client.ts`**

```ts
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export async function ensurePushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const registration = await navigator.serviceWorker.register('/sw.js')
  const existing = await registration.pushManager.getSubscription()
  if (existing) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const { publicKey } = await fetch('/api/push/vapid-public-key').then((res) => res.json())
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })
}
```

- [ ] **Step 5: Verify the build succeeds**

Run: `npm run build --workspace apps/web`
Expected: build succeeds with no errors.

- [ ] **Step 6: Manually verify subscription plumbing**

Run: `npm run dev` (from repo root), visit `http://localhost:3000`, open the browser dev console, and run `navigator.serviceWorker.getRegistrations()` — expect it to resolve empty until something calls `ensurePushSubscription()` (nothing does yet — that's Task 6). This step just confirms the service worker file is served correctly: visit `http://localhost:3000/sw.js` directly and confirm the browser displays the JS source rather than a 404.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): add push subscription service worker, client helper, and API routes"
```

---

## Task 5: `apps/web` — POST /api/pings route

**Files:**
- Modify: `apps/web/lib/api-error.ts`
- Create: `apps/web/app/api/pings/route.ts`

**Interfaces:**
- Consumes: `sendAvailabilityPing` from `@spont/core` (Task 2); `WebPushSender` from `apps/web/lib/push-sender.ts` (Task 3); `getCurrentUserId` (existing); `toErrorResponse` (existing, modified here).
- Produces: working `POST /api/pings` — consumed by the ping UI (Task 6).

- [ ] **Step 1: Add the new error code to `apps/web/lib/api-error.ts`**

Modify the `STATUS_BY_CODE` map to add one line:

```ts
const STATUS_BY_CODE: Record<string, number> = {
  SELF_FRIEND_REQUEST: 400,
  FRIENDSHIP_EXISTS: 409,
  ALREADY_MEMBER: 409,
  NOT_AUTHORIZED: 403,
  INVALID_STATE: 400,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
}
```

- [ ] **Step 2: Create `apps/web/app/api/pings/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { sendAvailabilityPing } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'
import { WebPushSender } from '@/lib/push-sender'

const pushSender = new WebPushSender()

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { groupId, message, windowEnd } = await request.json()
  try {
    const ping = await sendAvailabilityPing(
      prisma,
      pushSender,
      userId,
      groupId,
      message || undefined,
      windowEnd ? new Date(windowEnd) : undefined,
    )
    return NextResponse.json({ ping })
  } catch (err) {
    return toErrorResponse(err)
  }
}
```

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build --workspace apps/web`
Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(web): add POST /api/pings route"
```

---

## Task 6: `apps/web` — minimal ping UI on the home page

**Files:**
- Create: `apps/web/components/ping-button.tsx`
- Modify: `apps/web/app/page.tsx`

**Interfaces:**
- Consumes: `ensurePushSubscription` from `apps/web/lib/push-client.ts` (Task 4); the existing `GET /api/groups` route; `POST /api/pings` (Task 5).
- Produces: a working, intentionally unstyled "I'm free" flow on the home page — nothing later in this plan imports it. Visual design/placement is a follow-up, not part of this plan (see the spec's Deferred section).

- [ ] **Step 1: Create `apps/web/components/ping-button.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { ensurePushSubscription } from '@/lib/push-client'

type Group = { id: string; name: string }

export function PingButton() {
  const [open, setOpen] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState('')
  const [message, setMessage] = useState('')
  const [hours, setHours] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function openCompose() {
    await ensurePushSubscription()
    const res = await fetch('/api/groups')
    const data = await res.json()
    setGroups(data.groups)
    setGroupId(data.groups[0]?.id ?? '')
    setOpen(true)
  }

  async function send() {
    setStatus('sending')
    const windowEnd = hours
      ? new Date(Date.now() + Number(hours) * 60 * 60 * 1000).toISOString()
      : undefined

    const res = await fetch('/api/pings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, message: message || undefined, windowEnd }),
    })

    if (res.ok) {
      setOpen(false)
      setMessage('')
      setHours('')
      setStatus('idle')
    } else {
      const data = await res.json()
      setStatus('error')
      setErrorMessage(data.error?.message ?? 'Something went wrong')
    }
  }

  if (!open) {
    return <button onClick={openCompose}>I&apos;m free</button>
  }

  if (groups.length === 0) {
    return (
      <div>
        <p>You need a group first — go to Groups and create one.</p>
        <button onClick={() => setOpen(false)}>Close</button>
      </div>
    )
  }

  return (
    <div>
      <label>
        Group
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Message (optional)
        <input value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      <label>
        Free for how many hours? (optional)
        <input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} />
      </label>
      {status === 'error' && <p>{errorMessage}</p>}
      <button onClick={send} disabled={status === 'sending'}>
        Send
      </button>
      <button onClick={() => setOpen(false)}>Cancel</button>
    </div>
  )
}
```

- [ ] **Step 2: Add it to `apps/web/app/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { PingButton } from '@/components/ping-button'

export default async function HomePage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({ where: { id: userId } })

  return (
    <main>
      <h1>Welcome{user ? `, ${user.name}` : ''}</h1>
      <p>This is the foundation phase — scheduling suggestions arrive in a later phase.</p>
      <PingButton />
    </main>
  )
}
```

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build --workspace apps/web`
Expected: build succeeds with no errors.

- [ ] **Step 4: Manually verify the flow**

Run: `npm run dev`, visit `http://localhost:3000`, log in as any seeded user who owns or belongs to at least one group (create one under `/groups` first if needed).
1. Click "I'm free" — the browser should prompt for notification permission the first time.
2. Grant permission, pick a group, optionally type a message, click Send.
3. Confirm the button returns to its closed state with no error shown.
4. Log in as another member of that group (in a different browser or incognito window) and check `packages/db`'s data directly, or add a temporary `console.log`, to confirm a `Notification` row with `type: 'availability_ping'` was created for them. (There's no notifications UI to view this in yet on `main` — that's expected; this step is confirming the backend behavior, not a finished inbox experience.)
5. Click "I'm free" again immediately for the same group — expect a `RATE_LIMITED` error message to display instead of a second send.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add minimal availability ping UI to the home page"
```

---

## Task 7: End-to-end verification pass

**Files:** none (verification only)

**Interfaces:**
- Consumes: the entire feature built in Tasks 1–6.
- Produces: nothing — this is the final sign-off that the feature works end to end.

- [ ] **Step 1: Reset the local database to a known state**

Run:
```bash
docker compose down -v
docker compose up -d
npm run db:migrate
npm run db:seed
```
Expected: fresh Postgres volume, all migrations (including `add_availability_ping`) applied, seeded users present.

- [ ] **Step 2: Run the full automated test suite**

Run: `npm test`
Expected: all tests in `packages/db` and `packages/core` PASS, including the new `AvailabilityPing`/`PushSubscription` schema tests and the `sendAvailabilityPing` service tests.

- [ ] **Step 3: Run lint across all workspaces**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Walk the full flow in a browser**

Run: `npm run dev`, then:
1. Log in as a seeded user, create a group, and invite a second seeded user to it.
2. Log out, log in as the invitee, accept the group invite.
3. Log back in as the original user, click "I'm free," grant notification permission, pick the group, add a message, and send.
4. Confirm no console errors and no unhandled exceptions in the `npm run dev` terminal.
5. Attempt to send a second ping to the same group immediately — confirm the `RATE_LIMITED` error surfaces instead of a duplicate `Notification` row.

- [ ] **Step 5: Record the verification result**

If everything in Step 4 passed, note it in a persistent memory entry per `CONTRIBUTING.md`'s convention, e.g. `.claude/memory/<github-username>/persistent/availability-ping.md`, summarizing what was verified and any deviations from this plan.
