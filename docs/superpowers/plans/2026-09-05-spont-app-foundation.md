# Spont App — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Spont monorepo — repo scaffold, contributor tooling (including a per-contributor Claude memory system), a mock calendar abstraction with seeded fake data, the core data model, and working Friends/Groups/Notifications-shell/Settings-shell features — with no real Google auth yet.

**Architecture:** npm-workspaces monorepo (`apps/web` Next.js 14 App Router app; `packages/db` Prisma/Postgres data layer; `packages/core` framework-agnostic domain logic). A `CalendarProvider` interface isolates calendar access; only `MockCalendarProvider` (backed by seeded Postgres rows) is implemented in this phase. App auth is a dev-only seeded-user picker writing a signed cookie — real auth arrives in a later phase.

**Tech Stack:** TypeScript everywhere, Next.js 14, Prisma + Postgres (via Docker Compose locally), Vitest for `packages/db`/`packages/core` tests, npm workspaces (no pnpm/yarn/Turborepo), plain CSS (no styling framework — a low-stakes choice, easy to revisit later).

**Spec:** `docs/superpowers/specs/2026-09-05-spont-app-foundation-design.md`

## Global Constraints

- Node.js >= 20; npm workspaces only (`workspaces` field in root `package.json`), not pnpm/yarn.
- TypeScript `strict: true` in every package.
- Postgres is the only datastore, run locally via Docker Compose — no SQLite/in-memory substitutes, including in tests.
- API error responses always use the shape `{ error: { code: string, message: string } }`.
- `CalendarAccount.provider` is `'mock'` for every row created in this phase. `GoogleCalendarProvider` does not exist yet — do not add real Google OAuth or Calendar API calls in this phase.
- Per-contributor Claude memory lives at `.claude/memory/<github-username>/`, with `persistent/` committed and `ephemeral/` gitignored.
- Root convenience scripts (`npm run dev`, `npm test`, `npm run db:migrate`, `npm run db:seed`) load `.env` via `dotenv-cli`; package-level scripts (inside `apps/web`, `packages/db`, `packages/core`) stay plain and assume env vars are already in `process.env` (true both for root-invoked scripts and for CI, which sets env vars directly).

---

## Task 1: Root monorepo scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: npm workspaces roots `apps/*`, `packages/*`; root scripts `dev`, `build`, `lint`, `test`, `db:migrate`, `db:seed` that later tasks' package-level scripts plug into.

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "spont-app",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "dotenv -e .env -- npm run dev --workspace apps/web",
    "build": "dotenv -e .env -- npm run build --workspace apps/web",
    "lint": "npm run lint --workspaces --if-present",
    "test": "dotenv -e .env -- npm run test --workspaces --if-present",
    "db:migrate": "dotenv -e .env -- npm run migrate --workspace packages/db",
    "db:seed": "dotenv -e .env -- npm run seed --workspace packages/db"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "dotenv-cli": "^7.4.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
.next/
next-env.d.ts
.env
.env.local
*.log
.claude/memory/*/ephemeral/*
!.claude/memory/*/ephemeral/.gitkeep
```

- [ ] **Step 4: Create `.env.example`**

```
DATABASE_URL="postgresql://spont:spont@localhost:5432/spont"
SESSION_SECRET="dev-secret-change-me"
```

- [ ] **Step 5: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: spont
      POSTGRES_PASSWORD: spont
      POSTGRES_DB: spont
    ports:
      - "5432:5432"
    volumes:
      - spont_pg_data:/var/lib/postgresql/data

volumes:
  spont_pg_data:
```

- [ ] **Step 6: Verify install works**

Run: `npm install`
Expected: completes with no errors (no workspace packages exist yet, but the root install itself must succeed).

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.base.json .gitignore .env.example docker-compose.yml package-lock.json
git commit -m "chore: scaffold root monorepo config"
```

---

## Task 2: Contributor docs and CI

**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `CLAUDE.md`
- Create: `.claude/memory/TEMPLATE/MEMORY.md`
- Create: `.claude/memory/TEMPLATE/persistent/.gitkeep`
- Create: `.claude/memory/TEMPLATE/ephemeral/.gitkeep`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: root scripts from Task 1 (`db:migrate`, `db:seed`, `test`, `lint`, `dev`), referenced in README/CI.
- Produces: nothing later tasks import — this is documentation/CI only.

- [ ] **Step 1: Create `README.md`**

```markdown
# Spont

A scheduler that helps close friends spend more time together spontaneously,
by cutting down the time it takes to find when everyone's free.

This repo is mid-build. See `docs/superpowers/specs/` for the phase-by-phase
design and `docs/superpowers/plans/` for implementation plans.

## Local setup

1. `npm install`
2. `cp .env.example .env`
3. `docker compose up -d` (starts local Postgres)
4. `npm run db:migrate`
5. `npm run db:seed`
6. `npm run dev` — app runs at http://localhost:3000

Pick any seeded user on the login screen to explore the app as them. No
real Google account or Google Calendar connection is needed yet — Phase 1
runs entirely against seeded fake data (see the Phase 1 design spec for why).

## Running tests

`npm test` (runs Vitest across `packages/db` and `packages/core`; requires
Postgres running per the setup steps above).

## Contributing

See `CONTRIBUTING.md`, including the per-contributor Claude memory
convention under `.claude/memory/`.
```

- [ ] **Step 2: Create `CONTRIBUTING.md`**

```markdown
# Contributing

## Workflow

1. Follow the local setup steps in `README.md`.
2. Work off the current phase's plan in `docs/superpowers/plans/`.
3. Write a failing test before implementation code (TDD) — see existing
   tests in `packages/core` and `packages/db` for the pattern.
4. Commit frequently with focused commits.

## Claude session memory

Each contributor gets their own directory under
`.claude/memory/<your-github-username>/`, copied from
`.claude/memory/TEMPLATE/`:

- `persistent/` — committed. Decisions, architecture notes, and gotchas
  that should survive across sessions and be visible to the rest of the
  team. Reviewed like any other change in a PR.
- `ephemeral/` — gitignored. Scratch notes and in-progress task state.
  Safe to discard at any time; never expected to be reviewed.
- `MEMORY.md` — committed index of what's in `persistent/`, kept short.

If you're unsure whether something belongs in `persistent/` or
`ephemeral/`, ask: would a teammate (or your own next session) want this
even after the task it came from is done? If yes, `persistent/`. If it's
just scratch space for getting through the current task, `ephemeral/`.
```

- [ ] **Step 3: Create `CLAUDE.md`**

```markdown
# Spont App

See `README.md` for setup and `CONTRIBUTING.md` for the contributor
workflow, including the per-contributor memory convention under
`.claude/memory/`.

Current phase: see `docs/superpowers/specs/` for the latest design and
`docs/superpowers/plans/` for the active implementation plan.
```

- [ ] **Step 4: Create the contributor memory template**

`.claude/memory/TEMPLATE/MEMORY.md`:
```markdown
# Memory index

One line per persistent memory file, e.g.:
- [Decision: mock calendar provider](persistent/mock-calendar-provider.md) — why Phase 1 defers real Google OAuth
```

`.claude/memory/TEMPLATE/persistent/.gitkeep`: (empty file)

`.claude/memory/TEMPLATE/ephemeral/.gitkeep`: (empty file)

- [ ] **Step 5: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: spont
          POSTGRES_PASSWORD: spont
          POSTGRES_DB: spont
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://spont:spont@localhost:5432/spont
      SESSION_SECRET: ci-secret
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run generate --workspace packages/db
      - run: npm run migrate:deploy --workspace packages/db
      - run: npm run test --workspaces --if-present
      - run: npm run lint --workspaces --if-present
```

- [ ] **Step 6: Verify no broken links / valid YAML**

Run: `cat .github/workflows/ci.yml | python3 -c "import sys, yaml; yaml.safe_load(sys.stdin)"`
Expected: no error (valid YAML). If `yaml` isn't available, visually confirm indentation instead.

- [ ] **Step 7: Commit**

```bash
git add README.md CONTRIBUTING.md CLAUDE.md .claude/memory/TEMPLATE .github/workflows/ci.yml
git commit -m "docs: add contributor guide, memory template, and CI workflow"
```

---

## Task 3: `packages/db` — Prisma schema, client, and reset helper

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/test-utils.ts`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/vitest.config.ts`
- Test: `packages/db/src/schema.test.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` env var (from Task 1's `.env`).
- Produces: `prisma: PrismaClient` and `resetDb(): Promise<void>`, exported from `@spont/db` — used by every later task that touches the database. Prisma model types `User`, `CalendarAccount`, `CalendarEvent`, `Friendship`, `Group`, `GroupMembership`, `Notification` also come from this package (re-exported from `@prisma/client`).

- [ ] **Step 1: Create `packages/db/package.json`**

```json
{
  "name": "@spont/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "migrate": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "generate": "prisma generate",
    "seed": "tsx prisma/seed.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@prisma/client": "^5.14.0"
  },
  "devDependencies": {
    "prisma": "^5.14.0",
    "tsx": "^4.7.0",
    "vitest": "^1.6.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `packages/db/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/db/prisma/schema.prisma`**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  avatarUrl String?
  createdAt DateTime @default(now())

  calendarAccounts     CalendarAccount[]
  friendshipsInitiated Friendship[]      @relation("FriendshipUserA")
  friendshipsReceived  Friendship[]      @relation("FriendshipUserB")
  ownedGroups          Group[]
  groupMemberships     GroupMembership[]
  notifications        Notification[]
}

model CalendarAccount {
  id         String   @id @default(cuid())
  userId     String
  provider   String
  externalId String
  createdAt  DateTime @default(now())

  user   User            @relation(fields: [userId], references: [id])
  events CalendarEvent[]

  @@unique([userId, provider])
}

model CalendarEvent {
  id                String   @id @default(cuid())
  calendarAccountId String
  title             String
  startsAt          DateTime
  endsAt            DateTime
  rawLabel          String?
  isBusy            Boolean  @default(true)

  calendarAccount CalendarAccount @relation(fields: [calendarAccountId], references: [id])
}

enum FriendshipStatus {
  PENDING
  ACCEPTED
}

model Friendship {
  id        String           @id @default(cuid())
  userAId   String
  userBId   String
  status    FriendshipStatus @default(PENDING)
  createdAt DateTime         @default(now())

  userA User @relation("FriendshipUserA", fields: [userAId], references: [id])
  userB User @relation("FriendshipUserB", fields: [userBId], references: [id])

  @@unique([userAId, userBId])
}

model Group {
  id        String   @id @default(cuid())
  name      String
  ownerId   String
  createdAt DateTime @default(now())

  owner   User              @relation(fields: [ownerId], references: [id])
  members GroupMembership[]
}

enum GroupMemberStatus {
  INVITED
  ACCEPTED
  DECLINED
}

enum GroupMemberRole {
  OWNER
  MEMBER
}

model GroupMembership {
  id        String            @id @default(cuid())
  groupId   String
  userId    String
  status    GroupMemberStatus @default(INVITED)
  role      GroupMemberRole   @default(MEMBER)
  createdAt DateTime          @default(now())

  group Group @relation(fields: [groupId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@unique([groupId, userId])
}

model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String
  payload   Json
  readAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 4: Create `packages/db/src/client.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

- [ ] **Step 5: Create `packages/db/src/test-utils.ts`**

```ts
import { prisma } from './client'

export async function resetDb(): Promise<void> {
  await prisma.notification.deleteMany()
  await prisma.groupMembership.deleteMany()
  await prisma.group.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.calendarEvent.deleteMany()
  await prisma.calendarAccount.deleteMany()
  await prisma.user.deleteMany()
}
```

- [ ] **Step 6: Create `packages/db/src/index.ts`**

```ts
export * from '@prisma/client'
export * from './client'
export * from './test-utils'
```

- [ ] **Step 7: Create `packages/db/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    hookTimeout: 20000,
    testTimeout: 20000,
  },
})
```

- [ ] **Step 8: Write the failing test — `packages/db/src/schema.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from './index'

describe('schema', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('creates and reads back a user with a calendar account and event', async () => {
    const user = await prisma.user.create({ data: { name: 'Alice', email: 'alice@example.com' } })
    const account = await prisma.calendarAccount.create({
      data: { userId: user.id, provider: 'mock', externalId: 'mock-1' },
    })
    await prisma.calendarEvent.create({
      data: {
        calendarAccountId: account.id,
        title: 'Gym',
        startsAt: new Date('2026-01-01T10:00:00Z'),
        endsAt: new Date('2026-01-01T11:00:00Z'),
        rawLabel: 'Gym',
      },
    })

    const found = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { calendarAccounts: { include: { events: true } } },
    })

    expect(found.calendarAccounts).toHaveLength(1)
    expect(found.calendarAccounts[0].events).toHaveLength(1)
    expect(found.calendarAccounts[0].events[0].rawLabel).toBe('Gym')
  })

  it('resets cleanly between tests', async () => {
    const users = await prisma.user.findMany()
    expect(users).toHaveLength(0)
  })
})
```

- [ ] **Step 9: Install dependencies**

Run: `npm install` (from repo root)
Expected: `packages/db`'s dependencies install with no errors.

- [ ] **Step 10: Start Postgres and prepare the database**

Run:
```bash
cp .env.example .env
docker compose up -d
npm run generate --workspace packages/db
npm run migrate --workspace packages/db -- --name init
```
Expected: a migration is created under `packages/db/prisma/migrations/`, applied successfully, and the Prisma client is generated.

- [ ] **Step 11: Run the test to verify it passes**

Run: `npm run test --workspace packages/db`
Expected: both tests in `schema.test.ts` PASS.

- [ ] **Step 12: Commit**

```bash
git add packages/db package-lock.json
git commit -m "feat(db): add Prisma schema, client, and reset helper"
```

---

## Task 4: `packages/db` — seed data

**Files:**
- Create: `packages/db/src/seed-data.ts`
- Create: `packages/db/prisma/seed.ts`
- Test: `packages/db/src/seed-data.test.ts`

**Interfaces:**
- Consumes: `prisma`, `resetDb` from `packages/db/src/index.ts` (Task 3).
- Produces: `seedDatabase(prisma: PrismaClient): Promise<void>`, exported from `@spont/db` — used by the manual verification pass in Task 14 (via `npm run db:seed`).

- [ ] **Step 1: Write the failing test — `packages/db/src/seed-data.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from './index'
import { seedDatabase } from './seed-data'

describe('seedDatabase', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('creates 5 users, each with a mock calendar account and 5 events', async () => {
    await seedDatabase(prisma)

    const users = await prisma.user.findMany({
      include: { calendarAccounts: { include: { events: true } } },
    })

    expect(users).toHaveLength(5)
    for (const user of users) {
      expect(user.calendarAccounts).toHaveLength(1)
      expect(user.calendarAccounts[0].provider).toBe('mock')
      expect(user.calendarAccounts[0].events).toHaveLength(5)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace packages/db`
Expected: FAIL — `seed-data.ts` (and `seedDatabase`) don't exist yet.

- [ ] **Step 3: Implement `packages/db/src/seed-data.ts`**

```ts
import type { PrismaClient } from '@prisma/client'

function daysFromNow(days: number, hour: number): Date {
  const date = new Date()
  date.setHours(hour, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

const SEED_USERS = [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Carol', email: 'carol@example.com' },
  { name: 'Dave', email: 'dave@example.com' },
  { name: 'Erin', email: 'erin@example.com' },
]

const EVENT_TEMPLATES = [
  { dayOffset: 1, startHour: 9, endHour: 10, rawLabel: 'Gym' },
  { dayOffset: 1, startHour: 13, endHour: 17, rawLabel: 'Client Call' },
  { dayOffset: 3, startHour: 19, endHour: 21, rawLabel: 'Date Night' },
  { dayOffset: 5, startHour: 18, endHour: 20, rawLabel: 'Family Dinner' },
  { dayOffset: 7, startHour: 10, endHour: 12, rawLabel: 'Errands' },
]

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  for (const seedUser of SEED_USERS) {
    const user = await prisma.user.create({ data: seedUser })
    const account = await prisma.calendarAccount.create({
      data: { userId: user.id, provider: 'mock', externalId: `mock-${user.id}` },
    })
    await prisma.calendarEvent.createMany({
      data: EVENT_TEMPLATES.map((tmpl) => ({
        calendarAccountId: account.id,
        title: tmpl.rawLabel,
        startsAt: daysFromNow(tmpl.dayOffset, tmpl.startHour),
        endsAt: daysFromNow(tmpl.dayOffset, tmpl.endHour),
        rawLabel: tmpl.rawLabel,
        isBusy: true,
      })),
    })
  }
}
```

- [ ] **Step 4: Add the re-export to `packages/db/src/index.ts`**

Add this line alongside the existing exports:
```ts
export * from './seed-data'
```

- [ ] **Step 5: Create `packages/db/prisma/seed.ts`**

```ts
import { prisma, resetDb } from '../src/index'
import { seedDatabase } from '../src/seed-data'

async function main() {
  await resetDb()
  await seedDatabase(prisma)
  console.log('Seeded 5 users with mock calendars.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test --workspace packages/db`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/db
git commit -m "feat(db): add seed data for 5 fake users with mock calendars"
```

---

## Task 5: `packages/core` — CalendarProvider + MockCalendarProvider

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/errors.ts`
- Create: `packages/core/src/calendar-provider/types.ts`
- Create: `packages/core/src/calendar-provider/mock-provider.ts`
- Create: `packages/core/src/index.ts`
- Test: `packages/core/src/calendar-provider/mock-provider.test.ts`

**Interfaces:**
- Consumes: `prisma`, `resetDb`, `PrismaClient` type from `@spont/db` (Task 3).
- Produces: `AppError`, `DateRange`, `BusyBlock`, `NewEvent`, `CalendarProvider`, `MockCalendarProvider` — exported from `@spont/core`. `AppError` is used by every service in Tasks 6–7 and by `apps/web`'s error handling (Task 9).

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@spont/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "@spont/db": "*"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    hookTimeout: 20000,
    testTimeout: 20000,
  },
})
```

- [ ] **Step 4: Create `packages/core/src/errors.ts`**

```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
```

- [ ] **Step 5: Create `packages/core/src/calendar-provider/types.ts`**

```ts
export interface DateRange {
  start: Date
  end: Date
}

export interface BusyBlock {
  start: Date
  end: Date
  rawLabel: string | null
}

export interface NewEvent {
  title: string
  start: Date
  end: Date
}

export interface CreatedEvent {
  id: string
  title: string
  start: Date
  end: Date
}

export interface CalendarProvider {
  listBusyBlocks(calendarAccountId: string, range: DateRange): Promise<BusyBlock[]>
  listRawLabels(calendarAccountId: string): Promise<string[]>
  createEvent(calendarAccountId: string, event: NewEvent): Promise<CreatedEvent>
}
```

- [ ] **Step 6: Write the failing test — `packages/core/src/calendar-provider/mock-provider.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { MockCalendarProvider } from './mock-provider'

describe('MockCalendarProvider', () => {
  beforeEach(async () => {
    await resetDb()
  })

  async function makeAccount() {
    const user = await prisma.user.create({
      data: { name: 'Alice', email: `alice-${Date.now()}-${Math.random()}@example.com` },
    })
    return prisma.calendarAccount.create({
      data: { userId: user.id, provider: 'mock', externalId: 'mock-1' },
    })
  }

  it('lists busy blocks overlapping a range', async () => {
    const account = await makeAccount()
    const provider = new MockCalendarProvider(prisma)

    await prisma.calendarEvent.create({
      data: {
        calendarAccountId: account.id,
        title: 'Gym',
        startsAt: new Date('2026-01-01T10:00:00Z'),
        endsAt: new Date('2026-01-01T11:00:00Z'),
        rawLabel: 'Gym',
        isBusy: true,
      },
    })
    await prisma.calendarEvent.create({
      data: {
        calendarAccountId: account.id,
        title: 'Out of range',
        startsAt: new Date('2026-02-01T10:00:00Z'),
        endsAt: new Date('2026-02-01T11:00:00Z'),
        rawLabel: 'Work',
        isBusy: true,
      },
    })

    const blocks = await provider.listBusyBlocks(account.id, {
      start: new Date('2026-01-01T00:00:00Z'),
      end: new Date('2026-01-02T00:00:00Z'),
    })

    expect(blocks).toHaveLength(1)
    expect(blocks[0].rawLabel).toBe('Gym')
  })

  it('lists distinct raw labels for an account', async () => {
    const account = await makeAccount()
    const provider = new MockCalendarProvider(prisma)

    await prisma.calendarEvent.createMany({
      data: [
        {
          calendarAccountId: account.id,
          title: 'Gym',
          startsAt: new Date('2026-01-01T10:00:00Z'),
          endsAt: new Date('2026-01-01T11:00:00Z'),
          rawLabel: 'Gym',
        },
        {
          calendarAccountId: account.id,
          title: 'Gym again',
          startsAt: new Date('2026-01-02T10:00:00Z'),
          endsAt: new Date('2026-01-02T11:00:00Z'),
          rawLabel: 'Gym',
        },
        {
          calendarAccountId: account.id,
          title: 'Work',
          startsAt: new Date('2026-01-03T10:00:00Z'),
          endsAt: new Date('2026-01-03T11:00:00Z'),
          rawLabel: 'Work',
        },
      ],
    })

    const labels = await provider.listRawLabels(account.id)

    expect(labels.sort()).toEqual(['Gym', 'Work'])
  })

  it('creates an event', async () => {
    const account = await makeAccount()
    const provider = new MockCalendarProvider(prisma)

    const created = await provider.createEvent(account.id, {
      title: 'Dinner',
      start: new Date('2026-01-05T18:00:00Z'),
      end: new Date('2026-01-05T20:00:00Z'),
    })

    expect(created.title).toBe('Dinner')
    const stored = await prisma.calendarEvent.findUnique({ where: { id: created.id } })
    expect(stored?.isBusy).toBe(true)
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm run test --workspace packages/core`
Expected: FAIL — `mock-provider.ts` doesn't exist yet.

- [ ] **Step 8: Implement `packages/core/src/calendar-provider/mock-provider.ts`**

```ts
import type { PrismaClient } from '@spont/db'
import type { CalendarProvider, DateRange, BusyBlock, NewEvent, CreatedEvent } from './types'

export class MockCalendarProvider implements CalendarProvider {
  constructor(private readonly prisma: PrismaClient) {}

  async listBusyBlocks(calendarAccountId: string, range: DateRange): Promise<BusyBlock[]> {
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        calendarAccountId,
        isBusy: true,
        startsAt: { lt: range.end },
        endsAt: { gt: range.start },
      },
    })
    return events.map((e) => ({ start: e.startsAt, end: e.endsAt, rawLabel: e.rawLabel }))
  }

  async listRawLabels(calendarAccountId: string): Promise<string[]> {
    const events = await this.prisma.calendarEvent.findMany({
      where: { calendarAccountId, rawLabel: { not: null } },
      distinct: ['rawLabel'],
      select: { rawLabel: true },
    })
    return events.map((e) => e.rawLabel as string)
  }

  async createEvent(calendarAccountId: string, event: NewEvent): Promise<CreatedEvent> {
    const created = await this.prisma.calendarEvent.create({
      data: {
        calendarAccountId,
        title: event.title,
        startsAt: event.start,
        endsAt: event.end,
        isBusy: true,
      },
    })
    return { id: created.id, title: created.title, start: created.startsAt, end: created.endsAt }
  }
}
```

- [ ] **Step 9: Create `packages/core/src/index.ts`**

```ts
export * from './errors'
export * from './calendar-provider/types'
export * from './calendar-provider/mock-provider'
```

- [ ] **Step 10: Install dependencies and run test to verify it passes**

Run: `npm install && npm run test --workspace packages/core`
Expected: all 3 tests PASS.

- [ ] **Step 11: Commit**

```bash
git add packages/core package-lock.json
git commit -m "feat(core): add CalendarProvider interface and MockCalendarProvider"
```

---

## Task 6: `packages/core` — Friends service

**Files:**
- Create: `packages/core/src/friends/service.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/friends/service.test.ts`

**Interfaces:**
- Consumes: `AppError` (Task 5), `prisma`/`resetDb`/`PrismaClient`/`Friendship`/`User` types from `@spont/db`.
- Produces: `sendFriendRequest(prisma, fromUserId, toUserId): Promise<Friendship>`, `respondToFriendRequest(prisma, friendshipId, respondingUserId, accept): Promise<Friendship | null>`, `listFriends(prisma, userId): Promise<User[]>`, `listIncomingRequests(prisma, userId)`, `listOutgoingRequests(prisma, userId)` — all exported from `@spont/core`, used by `apps/web`'s Friends pages/API routes in Task 10.

- [ ] **Step 1: Write the failing tests — `packages/core/src/friends/service.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { AppError } from '../errors'
import { listFriends, listIncomingRequests, respondToFriendRequest, sendFriendRequest } from './service'

describe('friends service', () => {
  beforeEach(async () => {
    await resetDb()
  })

  async function makeUser(name: string) {
    return prisma.user.create({ data: { name, email: `${name.toLowerCase()}@example.com` } })
  }

  it('creates a pending friend request', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')

    const friendship = await sendFriendRequest(prisma, alice.id, bob.id)

    expect(friendship.status).toBe('PENDING')
    expect(friendship.userAId).toBe(alice.id)
    expect(friendship.userBId).toBe(bob.id)
  })

  it('rejects a self friend request', async () => {
    const alice = await makeUser('Alice')

    await expect(sendFriendRequest(prisma, alice.id, alice.id)).rejects.toThrow(AppError)
  })

  it('rejects a duplicate friend request in either direction', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    await sendFriendRequest(prisma, alice.id, bob.id)

    await expect(sendFriendRequest(prisma, alice.id, bob.id)).rejects.toThrow(AppError)
    await expect(sendFriendRequest(prisma, bob.id, alice.id)).rejects.toThrow(AppError)
  })

  it('lets the recipient accept a request', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const friendship = await sendFriendRequest(prisma, alice.id, bob.id)

    const accepted = await respondToFriendRequest(prisma, friendship.id, bob.id, true)

    expect(accepted?.status).toBe('ACCEPTED')
    const aliceFriends = await listFriends(prisma, alice.id)
    expect(aliceFriends.map((u) => u.id)).toContain(bob.id)
  })

  it('rejects a response from someone other than the recipient', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const friendship = await sendFriendRequest(prisma, alice.id, bob.id)

    await expect(respondToFriendRequest(prisma, friendship.id, alice.id, true)).rejects.toThrow(AppError)
  })

  it('removes the request on decline', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const friendship = await sendFriendRequest(prisma, alice.id, bob.id)

    await respondToFriendRequest(prisma, friendship.id, bob.id, false)

    const incoming = await listIncomingRequests(prisma, bob.id)
    expect(incoming).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace packages/core`
Expected: FAIL — `friends/service.ts` doesn't exist yet.

- [ ] **Step 3: Implement `packages/core/src/friends/service.ts`**

```ts
import type { PrismaClient, Friendship, User } from '@spont/db'
import { AppError } from '../errors'

export async function sendFriendRequest(
  prisma: PrismaClient,
  fromUserId: string,
  toUserId: string,
): Promise<Friendship> {
  if (fromUserId === toUserId) {
    throw new AppError('SELF_FRIEND_REQUEST', 'You cannot send a friend request to yourself')
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: fromUserId, userBId: toUserId },
        { userAId: toUserId, userBId: fromUserId },
      ],
    },
  })
  if (existing) {
    throw new AppError('FRIENDSHIP_EXISTS', 'A friendship or request already exists between these users')
  }

  return prisma.friendship.create({
    data: { userAId: fromUserId, userBId: toUserId, status: 'PENDING' },
  })
}

export async function respondToFriendRequest(
  prisma: PrismaClient,
  friendshipId: string,
  respondingUserId: string,
  accept: boolean,
): Promise<Friendship | null> {
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship) {
    throw new AppError('NOT_FOUND', 'Friend request not found')
  }
  if (friendship.userBId !== respondingUserId) {
    throw new AppError('NOT_AUTHORIZED', 'Only the recipient can respond to this request')
  }

  if (!accept) {
    await prisma.friendship.delete({ where: { id: friendshipId } })
    return null
  }

  return prisma.friendship.update({ where: { id: friendshipId }, data: { status: 'ACCEPTED' } })
}

export async function listFriends(prisma: PrismaClient, userId: string): Promise<User[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: { userA: true, userB: true },
  })
  return friendships.map((f) => (f.userAId === userId ? f.userB : f.userA))
}

export async function listIncomingRequests(prisma: PrismaClient, userId: string) {
  return prisma.friendship.findMany({
    where: { userBId: userId, status: 'PENDING' },
    include: { userA: true },
  })
}

export async function listOutgoingRequests(prisma: PrismaClient, userId: string) {
  return prisma.friendship.findMany({
    where: { userAId: userId, status: 'PENDING' },
    include: { userB: true },
  })
}
```

- [ ] **Step 4: Add the re-export to `packages/core/src/index.ts`**

Add this line alongside the existing exports:
```ts
export * from './friends/service'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test --workspace packages/core`
Expected: all friends-service tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat(core): add friends service"
```

---

## Task 7: `packages/core` — Groups service

**Files:**
- Create: `packages/core/src/groups/service.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/groups/service.test.ts`

**Interfaces:**
- Consumes: `AppError` (Task 5), `prisma`/`resetDb`/`PrismaClient`/`Group`/`GroupMembership` types from `@spont/db`.
- Produces: `createGroup(prisma, ownerId, name): Promise<Group>`, `inviteMember(prisma, groupId, inviterUserId, inviteeUserId): Promise<GroupMembership>`, `respondToInvite(prisma, membershipId, respondingUserId, accept): Promise<GroupMembership>`, `listGroupsForUser(prisma, userId): Promise<Group[]>`, `getGroupDetail(prisma, groupId, requestingUserId): Promise<Group & { members: (GroupMembership & { user: User })[] }>` — all exported from `@spont/core`, used by `apps/web`'s Groups pages/API routes in Task 11.

- [ ] **Step 1: Write the failing tests — `packages/core/src/groups/service.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { AppError } from '../errors'
import {
  createGroup,
  getGroupDetail,
  inviteMember,
  listGroupsForUser,
  respondToInvite,
} from './service'

describe('groups service', () => {
  beforeEach(async () => {
    await resetDb()
  })

  async function makeUser(name: string) {
    return prisma.user.create({ data: { name, email: `${name.toLowerCase()}@example.com` } })
  }

  it('creates a group with the creator as an accepted owner', async () => {
    const alice = await makeUser('Alice')

    const group = await createGroup(prisma, alice.id, 'College friends')

    const detail = await getGroupDetail(prisma, group.id, alice.id)
    expect(detail.members).toHaveLength(1)
    expect(detail.members[0]).toMatchObject({ userId: alice.id, status: 'ACCEPTED', role: 'OWNER' })
  })

  it('lets an accepted member invite someone new', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await createGroup(prisma, alice.id, 'Trip planning')

    const membership = await inviteMember(prisma, group.id, alice.id, bob.id)

    expect(membership.status).toBe('INVITED')
    expect(membership.role).toBe('MEMBER')
  })

  it('rejects an invite from a non-member', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const carol = await makeUser('Carol')
    const group = await createGroup(prisma, alice.id, 'Trip planning')

    await expect(inviteMember(prisma, group.id, bob.id, carol.id)).rejects.toThrow(AppError)
  })

  it('rejects inviting someone already a member', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await createGroup(prisma, alice.id, 'Trip planning')
    await inviteMember(prisma, group.id, alice.id, bob.id)

    await expect(inviteMember(prisma, group.id, alice.id, bob.id)).rejects.toThrow(AppError)
  })

  it('lets an invitee accept and then shows up in their group list', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await createGroup(prisma, alice.id, 'Trip planning')
    const membership = await inviteMember(prisma, group.id, alice.id, bob.id)

    await respondToInvite(prisma, membership.id, bob.id, true)

    const bobGroups = await listGroupsForUser(prisma, bob.id)
    expect(bobGroups.map((g) => g.id)).toContain(group.id)
  })

  it('rejects a response from someone other than the invitee', async () => {
    const alice = await makeUser('Alice')
    const bob = await makeUser('Bob')
    const group = await createGroup(prisma, alice.id, 'Trip planning')
    const membership = await inviteMember(prisma, group.id, alice.id, bob.id)

    await expect(respondToInvite(prisma, membership.id, alice.id, true)).rejects.toThrow(AppError)
  })

  it('rejects viewing group detail for a non-member', async () => {
    const alice = await makeUser('Alice')
    const carol = await makeUser('Carol')
    const group = await createGroup(prisma, alice.id, 'Trip planning')

    await expect(getGroupDetail(prisma, group.id, carol.id)).rejects.toThrow(AppError)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace packages/core`
Expected: FAIL — `groups/service.ts` doesn't exist yet.

- [ ] **Step 3: Implement `packages/core/src/groups/service.ts`**

```ts
import type { PrismaClient, Group, GroupMembership } from '@spont/db'
import { AppError } from '../errors'

export async function createGroup(prisma: PrismaClient, ownerId: string, name: string): Promise<Group> {
  return prisma.group.create({
    data: {
      name,
      ownerId,
      members: {
        create: { userId: ownerId, status: 'ACCEPTED', role: 'OWNER' },
      },
    },
  })
}

async function requireAcceptedMembership(
  prisma: PrismaClient,
  groupId: string,
  userId: string,
): Promise<GroupMembership> {
  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  })
  if (!membership || membership.status !== 'ACCEPTED') {
    throw new AppError('NOT_AUTHORIZED', 'You are not a member of this group')
  }
  return membership
}

export async function inviteMember(
  prisma: PrismaClient,
  groupId: string,
  inviterUserId: string,
  inviteeUserId: string,
): Promise<GroupMembership> {
  await requireAcceptedMembership(prisma, groupId, inviterUserId)

  const existing = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId: inviteeUserId } },
  })
  if (existing) {
    throw new AppError('ALREADY_MEMBER', 'This person is already invited or a member')
  }

  return prisma.groupMembership.create({
    data: { groupId, userId: inviteeUserId, status: 'INVITED', role: 'MEMBER' },
  })
}

export async function respondToInvite(
  prisma: PrismaClient,
  membershipId: string,
  respondingUserId: string,
  accept: boolean,
): Promise<GroupMembership> {
  const membership = await prisma.groupMembership.findUnique({ where: { id: membershipId } })
  if (!membership) {
    throw new AppError('NOT_FOUND', 'Invite not found')
  }
  if (membership.userId !== respondingUserId) {
    throw new AppError('NOT_AUTHORIZED', 'Only the invitee can respond to this invite')
  }
  if (membership.status !== 'INVITED') {
    throw new AppError('INVALID_STATE', 'This invite has already been responded to')
  }

  return prisma.groupMembership.update({
    where: { id: membershipId },
    data: { status: accept ? 'ACCEPTED' : 'DECLINED' },
  })
}

export async function listGroupsForUser(prisma: PrismaClient, userId: string): Promise<Group[]> {
  const memberships = await prisma.groupMembership.findMany({
    where: { userId, status: 'ACCEPTED' },
    include: { group: true },
  })
  return memberships.map((m) => m.group)
}

export async function getGroupDetail(prisma: PrismaClient, groupId: string, requestingUserId: string) {
  await requireAcceptedMembership(prisma, groupId, requestingUserId)

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: true } } },
  })
  if (!group) {
    throw new AppError('NOT_FOUND', 'Group not found')
  }
  return group
}
```

- [ ] **Step 4: Add the re-export to `packages/core/src/index.ts`**

Add this line alongside the existing exports:
```ts
export * from './groups/service'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test --workspace packages/core`
Expected: all groups-service tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat(core): add groups service"
```

---

## Task 8: `apps/web` — Next.js bootstrap

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/lib/session.ts`
- Create: `apps/web/components/logout-button.tsx`

**Interfaces:**
- Consumes: `prisma` from `@spont/db` (Task 3).
- Produces: `getCurrentUserId(): string | null`, `setSessionCookie(userId: string): void`, `clearSessionCookie(): void` from `apps/web/lib/session.ts` — used by every page and API route in Tasks 9–13. Root layout and nav shell that later pages render inside.

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@spont/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@spont/core": "*",
    "@spont/db": "*"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

- [ ] **Step 2: Create `apps/web/next.config.js`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@spont/core', '@spont/db'],
}

module.exports = nextConfig
```

- [ ] **Step 3: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `apps/web/lib/session.ts`**

```ts
import { cookies } from 'next/headers'
import crypto from 'node:crypto'

const COOKIE_NAME = 'spont_session'
const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me'

function sign(userId: string): string {
  const hmac = crypto.createHmac('sha256', SECRET).update(userId).digest('hex')
  return `${userId}.${hmac}`
}

function verify(value: string): string | null {
  const [userId, hmac] = value.split('.')
  if (!userId || !hmac) return null
  const expected = crypto.createHmac('sha256', SECRET).update(userId).digest('hex')
  return hmac === expected ? userId : null
}

export function setSessionCookie(userId: string): void {
  cookies().set(COOKIE_NAME, sign(userId), { httpOnly: true, sameSite: 'lax', path: '/' })
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME)
}

export function getCurrentUserId(): string | null {
  const value = cookies().get(COOKIE_NAME)?.value
  if (!value) return null
  return verify(value)
}
```

- [ ] **Step 5: Create `apps/web/components/logout-button.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return <button onClick={logout}>Log out</button>
}
```

- [ ] **Step 6: Create `apps/web/app/globals.css`**

```css
:root {
  color-scheme: light dark;
}

body {
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 0 1.5rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid #ccc;
}

nav {
  display: flex;
  gap: 1rem;
}
```

- [ ] **Step 7: Create `apps/web/app/layout.tsx`**

```tsx
import type { ReactNode } from 'react'
import Link from 'next/link'
import './globals.css'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { LogoutButton } from '@/components/logout-button'

export const metadata = { title: 'Spont' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const userId = getCurrentUserId()
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null

  return (
    <html lang="en">
      <body>
        <header>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/friends">Friends</Link>
            <Link href="/groups">Groups</Link>
            <Link href="/notifications">Notifications</Link>
            <Link href="/settings">Settings</Link>
          </nav>
          {user && (
            <span>
              {user.name} <LogoutButton />
            </span>
          )}
        </header>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 8: Create `apps/web/app/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'

export default async function HomePage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({ where: { id: userId } })

  return (
    <main>
      <h1>Welcome{user ? `, ${user.name}` : ''}</h1>
      <p>This is the foundation phase — scheduling suggestions arrive in a later phase.</p>
    </main>
  )
}
```

- [ ] **Step 9: Install dependencies and verify the build**

Run: `npm install && npm run build --workspace apps/web`
Expected: build fails at this point only because `/login` doesn't exist yet (Task 9) — that's fine; confirm the failure is specifically a missing-route/redirect-target issue, not a syntax/type error in the files created in this task. If Next reports any TypeScript error in `layout.tsx`, `page.tsx`, `session.ts`, or `logout-button.tsx`, fix it before proceeding.

- [ ] **Step 10: Commit**

```bash
git add apps/web package-lock.json
git commit -m "feat(web): bootstrap Next.js app with session helpers and nav shell"
```

---

## Task 9: `apps/web` — dev login, logout, and user directory

**Files:**
- Create: `apps/web/app/login/page.tsx`
- Create: `apps/web/app/api/auth/login/route.ts`
- Create: `apps/web/app/api/auth/logout/route.ts`
- Create: `apps/web/app/api/users/route.ts`
- Create: `apps/web/lib/api-error.ts`
- Create: `apps/web/middleware.ts`

**Interfaces:**
- Consumes: `AppError` from `@spont/core` (Task 5); `getCurrentUserId`/`setSessionCookie`/`clearSessionCookie` from `apps/web/lib/session.ts` (Task 8); `prisma` from `@spont/db`.
- Produces: `toErrorResponse(err: unknown): NextResponse` from `apps/web/lib/api-error.ts` — used by every API route in Tasks 10–11. A working `/login` route, satisfying the redirect target from Task 8's `page.tsx`.

- [ ] **Step 1: Create `apps/web/lib/api-error.ts`**

```ts
import { NextResponse } from 'next/server'
import { AppError } from '@spont/core'

const STATUS_BY_CODE: Record<string, number> = {
  SELF_FRIEND_REQUEST: 400,
  FRIENDSHIP_EXISTS: 409,
  ALREADY_MEMBER: 409,
  NOT_AUTHORIZED: 403,
  INVALID_STATE: 400,
  NOT_FOUND: 404,
}

export function toErrorResponse(err: unknown) {
  if (err instanceof AppError) {
    const status = STATUS_BY_CODE[err.code] ?? 400
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status })
  }
  console.error(err)
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
    { status: 500 },
  )
}
```

- [ ] **Step 2: Create `apps/web/app/api/users/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@spont/db'

export async function GET() {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json({ users })
}
```

- [ ] **Step 3: Create `apps/web/app/api/auth/login/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { setSessionCookie } from '@/lib/session'

export async function POST(request: NextRequest) {
  const { userId } = await request.json()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'No such user' } }, { status: 404 })
  }
  setSessionCookie(user.id)
  return NextResponse.json({ user })
}
```

- [ ] **Step 4: Create `apps/web/app/api/auth/logout/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session'

export async function POST() {
  clearSessionCookie()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create `apps/web/app/login/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type User = { id: string; name: string; email: string }

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => setUsers(data.users))
  }, [])

  async function login(userId: string) {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    router.push('/')
    router.refresh()
  }

  return (
    <main>
      <h1>Who are you?</h1>
      <p>Dev-only picker — pick a seeded user to explore the app as them.</p>
      <ul>
        {users.map((u) => (
          <li key={u.id}>
            <button onClick={() => login(u.id)}>{u.name}</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 6: Create `apps/web/middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/users']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }
  const session = request.cookies.get('spont_session')
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

Note: this middleware only checks cookie *presence* as a fast-path redirect for UX — it cannot verify the HMAC signature (Edge runtime doesn't have Node's `crypto`). The real authorization check is `getCurrentUserId()` (Task 8), called server-side in every page/route, which returns `null` for a forged or malformed cookie.

- [ ] **Step 7: Verify the build succeeds**

Run: `npm run build --workspace apps/web`
Expected: build succeeds with no errors.

- [ ] **Step 8: Manually verify the login flow**

Run: `npm run dev` (from repo root), then in a browser visit `http://localhost:3000`.
Expected: redirected to `/login`, seeded users are NOT yet present (seed script is added in Task 4 but hasn't been run against this environment yet — if `npm run db:seed` was already run per Task 3/4's steps, the picker lists Alice/Bob/Carol/Dave/Erin). Clicking a user logs in and redirects to `/`, showing "Welcome, `<name>`". Clicking "Log out" returns to `/login`.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): add dev login/logout and user directory API"
```

---

## Task 10: `apps/web` — Friends UI and API routes

**Files:**
- Create: `apps/web/app/api/friends/route.ts`
- Create: `apps/web/app/api/friends/[id]/route.ts`
- Create: `apps/web/app/friends/page.tsx`
- Create: `apps/web/app/friends/friends-client.tsx`

**Interfaces:**
- Consumes: `sendFriendRequest`, `respondToFriendRequest`, `listFriends`, `listIncomingRequests`, `listOutgoingRequests` from `@spont/core` (Task 6); `getCurrentUserId` (Task 8); `toErrorResponse` (Task 9).
- Produces: working `/friends` page and `/api/friends*` routes — nothing later tasks import.

- [ ] **Step 1: Create `apps/web/app/api/friends/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { sendFriendRequest } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { toUserId } = await request.json()
  try {
    const friendship = await sendFriendRequest(prisma, userId, toUserId)
    return NextResponse.json({ friendship })
  } catch (err) {
    return toErrorResponse(err)
  }
}
```

- [ ] **Step 2: Create `apps/web/app/api/friends/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { respondToFriendRequest } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { accept } = await request.json()
  try {
    const friendship = await respondToFriendRequest(prisma, params.id, userId, accept)
    return NextResponse.json({ friendship })
  } catch (err) {
    return toErrorResponse(err)
  }
}
```

- [ ] **Step 3: Create `apps/web/app/friends/friends-client.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type UserSummary = { id: string; name: string; email: string }

export function FriendsClient({
  accepted,
  incoming,
  outgoing,
  directory,
}: {
  accepted: UserSummary[]
  incoming: { id: string; from: UserSummary }[]
  outgoing: { id: string; to: UserSummary }[]
  directory: UserSummary[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function sendRequest(toUserId: string) {
    setPending(true)
    await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId }),
    })
    setPending(false)
    router.refresh()
  }

  async function respond(friendshipId: string, accept: boolean) {
    setPending(true)
    await fetch(`/api/friends/${friendshipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    })
    setPending(false)
    router.refresh()
  }

  return (
    <main>
      <h1>Friends</h1>

      <section>
        <h2>Your friends</h2>
        <ul>
          {accepted.map((u) => (
            <li key={u.id}>{u.name}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Requests waiting on you</h2>
        <ul>
          {incoming.map((r) => (
            <li key={r.id}>
              {r.from.name}{' '}
              <button disabled={pending} onClick={() => respond(r.id, true)}>
                Accept
              </button>{' '}
              <button disabled={pending} onClick={() => respond(r.id, false)}>
                Decline
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Sent, awaiting response</h2>
        <ul>
          {outgoing.map((r) => (
            <li key={r.id}>{r.to.name}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>People you can add</h2>
        <ul>
          {directory.map((u) => (
            <li key={u.id}>
              {u.name}{' '}
              <button disabled={pending} onClick={() => sendRequest(u.id)}>
                Add friend
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Create `apps/web/app/friends/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { listFriends, listIncomingRequests, listOutgoingRequests } from '@spont/core'
import { FriendsClient } from './friends-client'

export default async function FriendsPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const [accepted, incoming, outgoing, allUsers] = await Promise.all([
    listFriends(prisma, userId),
    listIncomingRequests(prisma, userId),
    listOutgoingRequests(prisma, userId),
    prisma.user.findMany({ where: { id: { not: userId } } }),
  ])

  const excludedIds = new Set([
    ...accepted.map((u) => u.id),
    ...incoming.map((f) => f.userAId),
    ...outgoing.map((f) => f.userBId),
  ])
  const directory = allUsers.filter((u) => !excludedIds.has(u.id))

  return (
    <FriendsClient
      accepted={accepted}
      incoming={incoming.map((f) => ({ id: f.id, from: f.userA }))}
      outgoing={outgoing.map((f) => ({ id: f.id, to: f.userB }))}
      directory={directory}
    />
  )
}
```

- [ ] **Step 5: Verify the build succeeds**

Run: `npm run build --workspace apps/web`
Expected: build succeeds with no errors.

- [ ] **Step 6: Manually verify the friends flow**

Run: `npm run dev`, log in as Alice (per Task 9), go to `/friends`, send a request to Bob. Log out, log in as Bob, accept it on `/friends`. Log back in as Alice and confirm Bob now appears under "Your friends".

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): add friends page and API routes"
```

---

## Task 11: `apps/web` — Groups UI and API routes

**Files:**
- Create: `apps/web/app/api/groups/route.ts`
- Create: `apps/web/app/api/groups/[id]/members/route.ts`
- Create: `apps/web/app/api/groups/members/[membershipId]/route.ts`
- Create: `apps/web/app/groups/page.tsx`
- Create: `apps/web/app/groups/groups-client.tsx`
- Create: `apps/web/app/groups/[id]/page.tsx`
- Create: `apps/web/app/groups/[id]/group-invite-response.tsx`
- Create: `apps/web/app/groups/[id]/group-detail-client.tsx`

**Interfaces:**
- Consumes: `createGroup`, `inviteMember`, `respondToInvite`, `listGroupsForUser`, `getGroupDetail` from `@spont/core` (Task 7); `getCurrentUserId` (Task 8); `toErrorResponse` (Task 9).
- Produces: working `/groups`, `/groups/[id]` pages and `/api/groups*` routes — nothing later tasks import.

- [ ] **Step 1: Create `apps/web/app/api/groups/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { createGroup, listGroupsForUser } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function GET() {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const groups = await listGroupsForUser(prisma, userId)
  return NextResponse.json({ groups })
}

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { name } = await request.json()
  try {
    const group = await createGroup(prisma, userId, name)
    return NextResponse.json({ group })
  } catch (err) {
    return toErrorResponse(err)
  }
}
```

- [ ] **Step 2: Create `apps/web/app/api/groups/[id]/members/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { inviteMember } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { userId: inviteeId } = await request.json()
  try {
    const membership = await inviteMember(prisma, params.id, userId, inviteeId)
    return NextResponse.json({ membership })
  } catch (err) {
    return toErrorResponse(err)
  }
}
```

- [ ] **Step 3: Create `apps/web/app/api/groups/members/[membershipId]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { respondToInvite } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function PATCH(request: NextRequest, { params }: { params: { membershipId: string } }) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { accept } = await request.json()
  try {
    const membership = await respondToInvite(prisma, params.membershipId, userId, accept)
    return NextResponse.json({ membership })
  } catch (err) {
    return toErrorResponse(err)
  }
}
```

- [ ] **Step 4: Create `apps/web/app/groups/groups-client.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export function GroupsClient({ groups }: { groups: { id: string; name: string }[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)

  async function createGroup() {
    if (!name.trim()) return
    setPending(true)
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setName('')
    setPending(false)
    router.refresh()
  }

  return (
    <main>
      <h1>Groups</h1>
      <ul>
        {groups.map((g) => (
          <li key={g.id}>
            <Link href={`/groups/${g.id}`}>{g.name}</Link>
          </li>
        ))}
      </ul>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" />
      <button disabled={pending} onClick={createGroup}>
        Create group
      </button>
    </main>
  )
}
```

- [ ] **Step 5: Create `apps/web/app/groups/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { GroupsClient } from './groups-client'

export default async function GroupsPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const memberships = await prisma.groupMembership.findMany({
    where: { userId, status: 'ACCEPTED' },
    include: { group: true },
  })

  return <GroupsClient groups={memberships.map((m) => m.group)} />
}
```

- [ ] **Step 6: Create `apps/web/app/groups/[id]/group-invite-response.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function GroupInviteResponse({ membershipId }: { membershipId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function respond(accept: boolean) {
    setPending(true)
    await fetch(`/api/groups/members/${membershipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    })
    setPending(false)
    router.refresh()
  }

  return (
    <div>
      <button disabled={pending} onClick={() => respond(true)}>
        Accept
      </button>{' '}
      <button disabled={pending} onClick={() => respond(false)}>
        Decline
      </button>
    </div>
  )
}
```

- [ ] **Step 7: Create `apps/web/app/groups/[id]/group-detail-client.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Member = {
  membershipId: string
  status: 'INVITED' | 'ACCEPTED' | 'DECLINED'
  role: 'OWNER' | 'MEMBER'
  user: { id: string; name: string }
}

export function GroupDetailClient({
  groupId,
  groupName,
  members,
  directory,
}: {
  groupId: string
  groupName: string
  members: Member[]
  directory: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function invite(userId: string) {
    setPending(true)
    await fetch(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setPending(false)
    router.refresh()
  }

  return (
    <main>
      <h1>{groupName}</h1>
      <h2>Members</h2>
      <ul>
        {members.map((m) => (
          <li key={m.membershipId}>
            {m.user.name} — {m.role.toLowerCase()} — {m.status.toLowerCase()}
          </li>
        ))}
      </ul>
      <h2>Invite someone</h2>
      <ul>
        {directory.map((u) => (
          <li key={u.id}>
            {u.name} <button disabled={pending} onClick={() => invite(u.id)}>Invite</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 8: Create `apps/web/app/groups/[id]/page.tsx`**

```tsx
import { redirect, notFound } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { getGroupDetail } from '@spont/core'
import { GroupInviteResponse } from './group-invite-response'
import { GroupDetailClient } from './group-detail-client'

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: params.id, userId } },
    include: { group: true },
  })
  if (!membership || membership.status === 'DECLINED') notFound()

  if (membership.status === 'INVITED') {
    return (
      <main>
        <h1>{membership.group.name}</h1>
        <p>You&apos;ve been invited to join this group.</p>
        <GroupInviteResponse membershipId={membership.id} />
      </main>
    )
  }

  const group = await getGroupDetail(prisma, params.id, userId)
  const memberIds = new Set(group.members.map((m) => m.userId))
  const directory = await prisma.user.findMany({ where: { id: { notIn: [...memberIds] } } })

  return (
    <GroupDetailClient
      groupId={group.id}
      groupName={group.name}
      members={group.members.map((m) => ({
        membershipId: m.id,
        status: m.status,
        role: m.role,
        user: { id: m.user.id, name: m.user.name },
      }))}
      directory={directory.map((u) => ({ id: u.id, name: u.name }))}
    />
  )
}
```

- [ ] **Step 9: Verify the build succeeds**

Run: `npm run build --workspace apps/web`
Expected: build succeeds with no errors.

- [ ] **Step 10: Manually verify the groups flow**

Log in as Alice, go to `/groups`, create a group "Test Group". Open it, invite Bob. Log out, log in as Bob, visit `/groups/<id>` (or add a link — clicking around is fine since Bob's `/groups` list won't show it until accepted), accept the invite. Confirm Bob now sees the group in `/groups` and Alice sees Bob listed as an accepted member.

- [ ] **Step 11: Commit**

```bash
git add apps/web
git commit -m "feat(web): add groups pages and API routes"
```

---

## Task 12: `apps/web` — Notifications shell

**Files:**
- Create: `apps/web/app/api/notifications/route.ts`
- Create: `apps/web/app/notifications/page.tsx`

**Interfaces:**
- Consumes: `getCurrentUserId` (Task 8), `prisma` from `@spont/db` (Notification model, Task 3).
- Produces: working `/notifications` page and `/api/notifications` route, reading the `Notification` table added in Task 3 — later phases (Phase 5) insert rows here without any schema or route changes.

- [ ] **Step 1: Create `apps/web/app/api/notifications/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { getCurrentUserId } from '@/lib/session'

export async function GET() {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ notifications })
}
```

- [ ] **Step 2: Create `apps/web/app/notifications/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'

export default async function NotificationsPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main>
      <h1>Notifications</h1>
      {notifications.length === 0 ? (
        <p>Nothing yet — this fills up once scheduling suggestions start going out.</p>
      ) : (
        <ul>
          {notifications.map((n) => (
            <li key={n.id}>{n.type}</li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build --workspace apps/web`
Expected: build succeeds with no errors.

- [ ] **Step 4: Manually verify the empty state**

Log in as any seeded user, visit `/notifications`, confirm the empty-state message renders (no notifications have ever been created, since nothing writes to this table yet).

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add notifications shell page and API route"
```

---

## Task 13: `apps/web` — Settings shell

**Files:**
- Create: `apps/web/app/settings/page.tsx`

**Interfaces:**
- Consumes: `getCurrentUserId` (Task 8), `prisma` from `@spont/db`.
- Produces: working `/settings` page — later phases (3, 5) add preference sections here without restructuring.

- [ ] **Step 1: Create `apps/web/app/settings/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'

export default async function SettingsPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) redirect('/login')

  return (
    <main>
      <h1>Settings</h1>
      <dl>
        <dt>Name</dt>
        <dd>{user.name}</dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
      </dl>
      <p>Scheduling preferences and notification settings arrive in later phases.</p>
    </main>
  )
}
```

- [ ] **Step 2: Verify the build succeeds**

Run: `npm run build --workspace apps/web`
Expected: build succeeds with no errors.

- [ ] **Step 3: Manually verify**

Log in as any seeded user, visit `/settings`, confirm name and email render correctly.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(web): add settings shell page"
```

---

## Task 14: End-to-end verification pass

**Files:** none (verification only)

**Interfaces:**
- Consumes: the entire app built in Tasks 1–13.
- Produces: nothing — this is the final sign-off that Phase 1 works end to end.

- [ ] **Step 1: Reset the local database to a known state**

Run:
```bash
docker compose down -v
docker compose up -d
npm run db:migrate
npm run db:seed
```
Expected: fresh Postgres volume, migrations applied, 5 seeded users each with a mock calendar account and 5 events.

- [ ] **Step 2: Run the full automated test suite**

Run: `npm test`
Expected: all tests in `packages/db` and `packages/core` PASS.

- [ ] **Step 3: Run lint across all workspaces**

Run: `npm run lint`
Expected: no errors (warnings acceptable if `eslint-config-next`'s defaults produce any on generated boilerplate — fix anything that flags an actual bug).

- [ ] **Step 4: Start the app and walk the full flow in a browser**

Run: `npm run dev`, then in a browser:
1. Visit `http://localhost:3000` — redirected to `/login`.
2. Log in as Alice.
3. Go to `/friends`, send a request to Bob.
4. Log out, log in as Bob, go to `/friends`, accept Alice's request.
5. Go to `/groups`, create "Test Group".
6. Open the group, invite Carol.
7. Log out, log in as Carol, navigate to the group URL, accept the invite.
8. Confirm `/groups` for both Bob and Carol shows "Test Group", and the group detail page for Alice shows both as accepted members.
9. Visit `/notifications` and `/settings` for any user and confirm they render without error.

Expected: every step above completes with no console errors and no unhandled exceptions in the terminal running `npm run dev`.

- [ ] **Step 5: Record the verification result**

If everything in Step 4 passed, note this in a persistent memory entry (per `CONTRIBUTING.md`'s convention) for whoever's contributor directory is doing this work, e.g. `.claude/memory/<github-username>/persistent/phase-1-foundation.md`, summarizing what was verified and any deviations from the plan. This is the only step in this task that touches a file — everything else is pure verification.
