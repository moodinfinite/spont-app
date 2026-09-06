# Label Taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a label taxonomy system that maps raw calendar labels to universal categories with user override and privacy-scoped sharing.

**Architecture:** Three new Prisma models (Category, LabelMapping, CategoryVisibility) with a core label-mapper module for rule-based classification and a privacy filter. Two new UI surfaces: Settings page sections (My Labels + Privacy) and a Schedule view (own + friend's privacy-filtered view). Follows existing patterns: service functions in `packages/core`, API routes in `apps/web`, TDD throughout.

**Tech Stack:** TypeScript, Prisma/PostgreSQL, Next.js 14 App Router, Vitest, React

**Spec:** `docs/superpowers/specs/2026-09-06-label-taxonomy-design.md`

## Global Constraints

- Node.js >= 20, npm workspaces (not pnpm/yarn)
- TypeScript strict mode everywhere
- Service functions take `prisma: PrismaClient` as first param, throw `AppError` for domain errors
- API routes use `getCurrentUserId()` for auth, `toErrorResponse()` for error handling
- Pages are server components that redirect to `/login` if unauthenticated, pass data to client components
- Client components use `'use client'`, `useState` for pending/error, `router.refresh()` after mutations
- Tests use `beforeEach(async () => { await resetDb() })` and helper functions for setup
- `fileParallelism: false` in vitest config (tests share Postgres)
- Import from `@spont/db` for Prisma types/client, `@spont/core` for business logic, `@/lib/*` for web utilities

---

### Task 1: Schema — Category, LabelMapping, CategoryVisibility

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Modify: `packages/db/src/test-utils.ts` (add new tables to resetDb deletion order)
- Modify: `packages/db/src/seed-data.ts` (seed categories + auto-map labels + default visibility)
- Modify: `packages/db/src/seed-data.test.ts` (verify new seed data)
- Test: `packages/db/src/seed-data.test.ts`

**Interfaces:**
- Consumes: existing Prisma schema, `seedDatabase`, `resetDb`
- Produces: `Category`, `LabelMapping`, `CategoryVisibility` Prisma models; updated `seedDatabase` that creates 7 categories, maps seed labels, and sets default visibility; updated `resetDb` that cleans new tables

- [ ] **Step 1: Add the three new models to the Prisma schema**

Add to `packages/db/prisma/schema.prisma`:

```prisma
model Category {
  id           String   @id @default(cuid())
  name         String   @unique
  displayOrder Int

  labelMappings       LabelMapping[]
  categoryVisibilities CategoryVisibility[]
}

enum MappingSource {
  RULE
  MANUAL
}

model LabelMapping {
  id         String        @id @default(cuid())
  userId     String
  rawLabel   String
  categoryId String
  source     MappingSource @default(RULE)
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  user     User     @relation(fields: [userId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@unique([userId, rawLabel])
}

enum DisplayMode {
  CATEGORY_NAME
  BUSY_ONLY
  HIDDEN
}

model CategoryVisibility {
  id          String      @id @default(cuid())
  userId      String
  categoryId  String
  displayMode DisplayMode @default(CATEGORY_NAME)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user     User     @relation(fields: [userId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@unique([userId, categoryId])
}
```

Also add relation fields to the existing `User` model:

```prisma
// Add to User model:
labelMappings        LabelMapping[]
categoryVisibilities CategoryVisibility[]
```

- [ ] **Step 2: Run the migration**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npx dotenv -e .env -- npx prisma migrate dev --name add-label-taxonomy
```

Expected: Migration succeeds, new tables created.

- [ ] **Step 3: Update resetDb to delete new tables (before user deletion)**

In `packages/db/src/test-utils.ts`, add deletions for the new tables. They must come before `user.deleteMany()` due to foreign keys. Add them at the top of the function:

```typescript
export async function resetDb(): Promise<void> {
  await prisma.categoryVisibility.deleteMany()
  await prisma.labelMapping.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.groupMembership.deleteMany()
  await prisma.group.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.calendarEvent.deleteMany()
  await prisma.calendarAccount.deleteMany()
  await prisma.user.deleteMany()
  await prisma.category.deleteMany()
}
```

Note: `category.deleteMany()` goes last because `labelMapping` and `categoryVisibility` reference it.

- [ ] **Step 4: Update seedDatabase to create categories, map labels, and set default visibility**

Replace the contents of `packages/db/src/seed-data.ts`:

```typescript
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

const CATEGORIES = [
  { name: 'Work', displayOrder: 1 },
  { name: 'Personal', displayOrder: 2 },
  { name: 'Social', displayOrder: 3 },
  { name: 'Health/Fitness', displayOrder: 4 },
  { name: 'Family', displayOrder: 5 },
  { name: 'Errands', displayOrder: 6 },
  { name: 'Other', displayOrder: 7 },
]

const LABEL_TO_CATEGORY: Record<string, string> = {
  'Gym': 'Health/Fitness',
  'Client Call': 'Work',
  'Date Night': 'Personal',
  'Family Dinner': 'Family',
  'Errands': 'Errands',
}

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  const categories = await Promise.all(
    CATEGORIES.map((c) => prisma.category.create({ data: c })),
  )
  const categoryByName = new Map(categories.map((c) => [c.name, c]))

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

    for (const tmpl of EVENT_TEMPLATES) {
      const categoryName = LABEL_TO_CATEGORY[tmpl.rawLabel]
      if (categoryName) {
        const category = categoryByName.get(categoryName)!
        await prisma.labelMapping.create({
          data: {
            userId: user.id,
            rawLabel: tmpl.rawLabel,
            categoryId: category.id,
            source: 'RULE',
          },
        })
      }
    }

    for (const category of categories) {
      await prisma.categoryVisibility.create({
        data: {
          userId: user.id,
          categoryId: category.id,
          displayMode: 'CATEGORY_NAME',
        },
      })
    }
  }
}
```

- [ ] **Step 5: Write the failing seed test**

Add to `packages/db/src/seed-data.test.ts`:

```typescript
it('creates 7 categories', async () => {
  await seedDatabase(prisma)
  const categories = await prisma.category.findMany({ orderBy: { displayOrder: 'asc' } })
  expect(categories).toHaveLength(7)
  expect(categories.map((c) => c.name)).toEqual([
    'Work', 'Personal', 'Social', 'Health/Fitness', 'Family', 'Errands', 'Other',
  ])
})

it('creates label mappings for each user', async () => {
  await seedDatabase(prisma)
  const mappings = await prisma.labelMapping.findMany()
  // 5 users * 5 labels = 25 mappings
  expect(mappings).toHaveLength(25)
  expect(mappings.every((m) => m.source === 'RULE')).toBe(true)
})

it('creates default category visibility for each user', async () => {
  await seedDatabase(prisma)
  const visibilities = await prisma.categoryVisibility.findMany()
  // 5 users * 7 categories = 35 visibility rows
  expect(visibilities).toHaveLength(35)
  expect(visibilities.every((v) => v.displayMode === 'CATEGORY_NAME')).toBe(true)
})
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npm test --workspace packages/db
```

Expected: All tests pass, including new seed tests.

- [ ] **Step 7: Commit**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && git add packages/db/prisma/schema.prisma packages/db/src/test-utils.ts packages/db/src/seed-data.ts packages/db/src/seed-data.test.ts packages/db/prisma/migrations/ && git commit -m "feat: add Category, LabelMapping, CategoryVisibility schema and seed data"
```

---

### Task 2: Core — Rule-based label mapper

**Files:**
- Create: `packages/core/src/label-mapper/rules.ts`
- Create: `packages/core/src/label-mapper/service.ts`
- Create: `packages/core/src/label-mapper/service.test.ts`
- Modify: `packages/core/src/index.ts` (add exports)

**Interfaces:**
- Consumes: `PrismaClient`, `Category`, `LabelMapping` from `@spont/db`
- Produces:
  - `mapLabelByRule(rawLabel: string): string | null` — returns category name or null if no rule matches
  - `ensureMappings(prisma: PrismaClient, userId: string): Promise<LabelMapping[]>` — auto-maps all unmapped labels for a user, returns full list
  - `overrideMapping(prisma: PrismaClient, userId: string, rawLabel: string, categoryId: string): Promise<LabelMapping>` — sets/updates a manual override
  - `resetMapping(prisma: PrismaClient, userId: string, rawLabel: string): Promise<LabelMapping>` — re-runs rule engine and saves result

- [ ] **Step 1: Write the rule engine**

Create `packages/core/src/label-mapper/rules.ts`:

```typescript
const RULES: { pattern: string; category: string }[] = [
  { pattern: 'gym', category: 'Health/Fitness' },
  { pattern: 'workout', category: 'Health/Fitness' },
  { pattern: 'yoga', category: 'Health/Fitness' },
  { pattern: 'run', category: 'Health/Fitness' },
  { pattern: 'client call', category: 'Work' },
  { pattern: 'meeting', category: 'Work' },
  { pattern: 'standup', category: 'Work' },
  { pattern: '1:1', category: 'Work' },
  { pattern: 'date night', category: 'Personal' },
  { pattern: 'date', category: 'Personal' },
  { pattern: 'family dinner', category: 'Family' },
  { pattern: 'family', category: 'Family' },
  { pattern: 'errands', category: 'Errands' },
  { pattern: 'groceries', category: 'Errands' },
  { pattern: 'dentist', category: 'Errands' },
  { pattern: 'doctor', category: 'Errands' },
  { pattern: 'happy hour', category: 'Social' },
  { pattern: 'party', category: 'Social' },
  { pattern: 'hangout', category: 'Social' },
  { pattern: 'brunch', category: 'Social' },
]

export function mapLabelByRule(rawLabel: string): string | null {
  const lower = rawLabel.toLowerCase()
  for (const rule of RULES) {
    if (lower.includes(rule.pattern)) {
      return rule.category
    }
  }
  return null
}
```

- [ ] **Step 2: Write failing tests for the rule engine**

Create `packages/core/src/label-mapper/service.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { mapLabelByRule } from './rules'
import { ensureMappings, overrideMapping, resetMapping } from './service'

describe('mapLabelByRule', () => {
  it('matches exact labels', () => {
    expect(mapLabelByRule('Gym')).toBe('Health/Fitness')
    expect(mapLabelByRule('Client Call')).toBe('Work')
    expect(mapLabelByRule('Date Night')).toBe('Personal')
    expect(mapLabelByRule('Family Dinner')).toBe('Family')
    expect(mapLabelByRule('Errands')).toBe('Errands')
    expect(mapLabelByRule('Happy Hour')).toBe('Social')
  })

  it('matches case-insensitively', () => {
    expect(mapLabelByRule('GYM')).toBe('Health/Fitness')
    expect(mapLabelByRule('client call')).toBe('Work')
  })

  it('matches substrings', () => {
    expect(mapLabelByRule('Morning Gym Session')).toBe('Health/Fitness')
    expect(mapLabelByRule('Weekly Standup')).toBe('Work')
  })

  it('returns null for unmatched labels', () => {
    expect(mapLabelByRule('Piano Lesson')).toBeNull()
    expect(mapLabelByRule('Random Event')).toBeNull()
  })
})
```

- [ ] **Step 3: Run tests to verify rule engine tests pass**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npm test --workspace packages/core
```

Expected: `mapLabelByRule` tests pass.

- [ ] **Step 4: Write failing tests for the mapping service**

Add to `packages/core/src/label-mapper/service.test.ts`:

```typescript
describe('ensureMappings', () => {
  beforeEach(async () => {
    await resetDb()
  })

  async function seedUserWithLabels(labels: string[]) {
    const categories = await Promise.all([
      prisma.category.create({ data: { name: 'Work', displayOrder: 1 } }),
      prisma.category.create({ data: { name: 'Personal', displayOrder: 2 } }),
      prisma.category.create({ data: { name: 'Social', displayOrder: 3 } }),
      prisma.category.create({ data: { name: 'Health/Fitness', displayOrder: 4 } }),
      prisma.category.create({ data: { name: 'Family', displayOrder: 5 } }),
      prisma.category.create({ data: { name: 'Errands', displayOrder: 6 } }),
      prisma.category.create({ data: { name: 'Other', displayOrder: 7 } }),
    ])
    const user = await prisma.user.create({
      data: { name: 'Alice', email: 'alice@example.com' },
    })
    const account = await prisma.calendarAccount.create({
      data: { userId: user.id, provider: 'mock', externalId: `mock-${user.id}` },
    })
    for (const label of labels) {
      await prisma.calendarEvent.create({
        data: {
          calendarAccountId: account.id,
          title: label,
          startsAt: new Date(),
          endsAt: new Date(),
          rawLabel: label,
          isBusy: true,
        },
      })
    }
    return { user, categories }
  }

  it('creates mappings for all unmapped labels', async () => {
    const { user } = await seedUserWithLabels(['Gym', 'Client Call', 'Piano Lesson'])
    const mappings = await ensureMappings(prisma, user.id)
    expect(mappings).toHaveLength(3)

    const gym = mappings.find((m) => m.rawLabel === 'Gym')!
    expect(gym.source).toBe('RULE')

    const piano = mappings.find((m) => m.rawLabel === 'Piano Lesson')!
    expect(piano.source).toBe('RULE')
    const otherCategory = await prisma.category.findFirst({ where: { name: 'Other' } })
    expect(piano.categoryId).toBe(otherCategory!.id)
  })

  it('does not overwrite existing manual mappings', async () => {
    const { user } = await seedUserWithLabels(['Gym'])
    const mappings = await ensureMappings(prisma, user.id)
    const socialCategory = await prisma.category.findFirst({ where: { name: 'Social' } })
    await overrideMapping(prisma, user.id, 'Gym', socialCategory!.id)

    const refreshed = await ensureMappings(prisma, user.id)
    const gym = refreshed.find((m) => m.rawLabel === 'Gym')!
    expect(gym.categoryId).toBe(socialCategory!.id)
    expect(gym.source).toBe('MANUAL')
  })
})

describe('overrideMapping', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('creates a manual mapping', async () => {
    await prisma.category.create({ data: { name: 'Social', displayOrder: 3 } })
    const otherCat = await prisma.category.create({ data: { name: 'Other', displayOrder: 7 } })
    const socialCat = await prisma.category.findFirst({ where: { name: 'Social' } })
    const user = await prisma.user.create({
      data: { name: 'Alice', email: 'alice@example.com' },
    })
    const mapping = await overrideMapping(prisma, user.id, 'Gym', socialCat!.id)
    expect(mapping.source).toBe('MANUAL')
    expect(mapping.categoryId).toBe(socialCat!.id)
  })
})

describe('resetMapping', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('resets a manual mapping back to rule-based', async () => {
    const healthCat = await prisma.category.create({ data: { name: 'Health/Fitness', displayOrder: 4 } })
    const socialCat = await prisma.category.create({ data: { name: 'Social', displayOrder: 3 } })
    await prisma.category.create({ data: { name: 'Other', displayOrder: 7 } })
    const user = await prisma.user.create({
      data: { name: 'Alice', email: 'alice@example.com' },
    })
    await overrideMapping(prisma, user.id, 'Gym', socialCat.id)
    const reset = await resetMapping(prisma, user.id, 'Gym')
    expect(reset.source).toBe('RULE')
    expect(reset.categoryId).toBe(healthCat.id)
  })
})
```

- [ ] **Step 5: Write the mapping service**

Create `packages/core/src/label-mapper/service.ts`:

```typescript
import type { PrismaClient, LabelMapping } from '@spont/db'
import { AppError } from '../errors'
import { mapLabelByRule } from './rules'

export async function ensureMappings(
  prisma: PrismaClient,
  userId: string,
): Promise<LabelMapping[]> {
  const accounts = await prisma.calendarAccount.findMany({ where: { userId } })
  const accountIds = accounts.map((a) => a.id)

  const events = await prisma.calendarEvent.findMany({
    where: { calendarAccountId: { in: accountIds }, rawLabel: { not: null } },
    distinct: ['rawLabel'],
    select: { rawLabel: true },
  })
  const rawLabels = events.map((e) => e.rawLabel as string)

  const existing = await prisma.labelMapping.findMany({ where: { userId } })
  const mappedLabels = new Set(existing.map((m) => m.rawLabel))

  const categories = await prisma.category.findMany()
  const categoryByName = new Map(categories.map((c) => [c.name, c]))
  const otherCategory = categoryByName.get('Other')!

  for (const rawLabel of rawLabels) {
    if (mappedLabels.has(rawLabel)) continue
    const categoryName = mapLabelByRule(rawLabel) ?? 'Other'
    const category = categoryByName.get(categoryName) ?? otherCategory
    await prisma.labelMapping.create({
      data: { userId, rawLabel, categoryId: category.id, source: 'RULE' },
    })
  }

  return prisma.labelMapping.findMany({
    where: { userId },
    include: { category: true },
  })
}

export async function overrideMapping(
  prisma: PrismaClient,
  userId: string,
  rawLabel: string,
  categoryId: string,
): Promise<LabelMapping> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) throw new AppError('NOT_FOUND', 'Category not found')

  return prisma.labelMapping.upsert({
    where: { userId_rawLabel: { userId, rawLabel } },
    create: { userId, rawLabel, categoryId, source: 'MANUAL' },
    update: { categoryId, source: 'MANUAL' },
  })
}

export async function resetMapping(
  prisma: PrismaClient,
  userId: string,
  rawLabel: string,
): Promise<LabelMapping> {
  const categories = await prisma.category.findMany()
  const categoryByName = new Map(categories.map((c) => [c.name, c]))
  const otherCategory = categoryByName.get('Other')!

  const categoryName = mapLabelByRule(rawLabel) ?? 'Other'
  const category = categoryByName.get(categoryName) ?? otherCategory

  return prisma.labelMapping.upsert({
    where: { userId_rawLabel: { userId, rawLabel } },
    create: { userId, rawLabel, categoryId: category.id, source: 'RULE' },
    update: { categoryId: category.id, source: 'RULE' },
  })
}
```

- [ ] **Step 6: Add exports to barrel**

Add to `packages/core/src/index.ts`:

```typescript
export * from './label-mapper/rules'
export * from './label-mapper/service'
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npm test --workspace packages/core
```

Expected: All label mapper tests pass.

- [ ] **Step 8: Commit**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && git add packages/core/src/label-mapper/ packages/core/src/index.ts && git commit -m "feat: add rule-based label mapper with ensureMappings, overrideMapping, resetMapping"
```

---

### Task 3: Core — Privacy filter

**Files:**
- Create: `packages/core/src/label-mapper/privacy.ts`
- Create: `packages/core/src/label-mapper/privacy.test.ts`
- Modify: `packages/core/src/index.ts` (add export)

**Interfaces:**
- Consumes: `BusyBlock` from `calendar-provider/types`, `LabelMapping`, `CategoryVisibility` from `@spont/db`
- Produces:
  - `ViewableBlock` type: `{ start: Date; end: Date; label: string | null }`
  - `filterEventsForViewer(events: BusyBlock[], mappings: LabelMapping[], visibility: CategoryVisibility[]): ViewableBlock[]`

- [ ] **Step 1: Write failing tests**

Create `packages/core/src/label-mapper/privacy.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { filterEventsForViewer } from './privacy'
import type { BusyBlock } from '../calendar-provider/types'

function block(rawLabel: string | null): BusyBlock {
  return { start: new Date('2026-09-06T09:00:00'), end: new Date('2026-09-06T10:00:00'), rawLabel }
}

function mapping(rawLabel: string, categoryId: string) {
  return { rawLabel, categoryId, category: { name: categoryId } } as any
}

function visibility(categoryId: string, displayMode: 'CATEGORY_NAME' | 'BUSY_ONLY' | 'HIDDEN') {
  return { categoryId, displayMode } as any
}

describe('filterEventsForViewer', () => {
  it('shows category name when displayMode is CATEGORY_NAME', () => {
    const events = [block('Gym')]
    const mappings = [mapping('Gym', 'health')]
    const vis = [visibility('health', 'CATEGORY_NAME')]
    const result = filterEventsForViewer(events, mappings, vis)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('health')
  })

  it('shows "Busy" when displayMode is BUSY_ONLY', () => {
    const events = [block('Gym')]
    const mappings = [mapping('Gym', 'health')]
    const vis = [visibility('health', 'BUSY_ONLY')]
    const result = filterEventsForViewer(events, mappings, vis)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Busy')
  })

  it('omits events when displayMode is HIDDEN', () => {
    const events = [block('Gym')]
    const mappings = [mapping('Gym', 'health')]
    const vis = [visibility('health', 'HIDDEN')]
    const result = filterEventsForViewer(events, mappings, vis)
    expect(result).toHaveLength(0)
  })

  it('defaults to CATEGORY_NAME when no visibility row exists', () => {
    const events = [block('Gym')]
    const mappings = [mapping('Gym', 'health')]
    const result = filterEventsForViewer(events, mappings, [])
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('health')
  })

  it('shows "Busy" for events with no rawLabel', () => {
    const events = [block(null)]
    const result = filterEventsForViewer(events, [], [])
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Busy')
  })

  it('preserves start and end times', () => {
    const events = [block('Gym')]
    const mappings = [mapping('Gym', 'health')]
    const result = filterEventsForViewer(events, mappings, [])
    expect(result[0].start).toEqual(new Date('2026-09-06T09:00:00'))
    expect(result[0].end).toEqual(new Date('2026-09-06T10:00:00'))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npm test --workspace packages/core
```

Expected: FAIL — `filterEventsForViewer` not found.

- [ ] **Step 3: Write the privacy filter**

Create `packages/core/src/label-mapper/privacy.ts`:

```typescript
import type { BusyBlock } from '../calendar-provider/types'

export interface ViewableBlock {
  start: Date
  end: Date
  label: string | null
}

interface MappingWithCategory {
  rawLabel: string
  categoryId: string
  category: { name: string }
}

interface VisibilitySetting {
  categoryId: string
  displayMode: 'CATEGORY_NAME' | 'BUSY_ONLY' | 'HIDDEN'
}

export function filterEventsForViewer(
  events: BusyBlock[],
  mappings: MappingWithCategory[],
  visibility: VisibilitySetting[],
): ViewableBlock[] {
  const mappingByLabel = new Map(mappings.map((m) => [m.rawLabel, m]))
  const visibilityByCategoryId = new Map(visibility.map((v) => [v.categoryId, v.displayMode]))

  const result: ViewableBlock[] = []

  for (const event of events) {
    const mapping = event.rawLabel ? mappingByLabel.get(event.rawLabel) : null

    if (!mapping) {
      result.push({ start: event.start, end: event.end, label: 'Busy' })
      continue
    }

    const displayMode = visibilityByCategoryId.get(mapping.categoryId) ?? 'CATEGORY_NAME'

    if (displayMode === 'HIDDEN') continue

    const label = displayMode === 'BUSY_ONLY' ? 'Busy' : mapping.category.name

    result.push({ start: event.start, end: event.end, label })
  }

  return result
}
```

- [ ] **Step 4: Add export to barrel**

Add to `packages/core/src/index.ts`:

```typescript
export * from './label-mapper/privacy'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npm test --workspace packages/core
```

Expected: All privacy filter tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && git add packages/core/src/label-mapper/privacy.ts packages/core/src/label-mapper/privacy.test.ts packages/core/src/index.ts && git commit -m "feat: add privacy filter for viewer-scoped event display"
```

---

### Task 4: Core — Category visibility service

**Files:**
- Create: `packages/core/src/label-mapper/visibility.ts`
- Create: `packages/core/src/label-mapper/visibility.test.ts`
- Modify: `packages/core/src/index.ts` (add export)

**Interfaces:**
- Consumes: `PrismaClient`, `CategoryVisibility` from `@spont/db`
- Produces:
  - `getVisibilitySettings(prisma: PrismaClient, userId: string): Promise<CategoryVisibility[]>`
  - `updateVisibility(prisma: PrismaClient, userId: string, categoryId: string, displayMode: 'CATEGORY_NAME' | 'BUSY_ONLY' | 'HIDDEN'): Promise<CategoryVisibility>`

- [ ] **Step 1: Write failing tests**

Create `packages/core/src/label-mapper/visibility.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '@spont/db'
import { getVisibilitySettings, updateVisibility } from './visibility'

describe('visibility service', () => {
  beforeEach(async () => {
    await resetDb()
  })

  async function setup() {
    const user = await prisma.user.create({
      data: { name: 'Alice', email: 'alice@example.com' },
    })
    const category = await prisma.category.create({
      data: { name: 'Work', displayOrder: 1 },
    })
    return { user, category }
  }

  it('returns empty array when no visibility rows exist', async () => {
    const { user } = await setup()
    const settings = await getVisibilitySettings(prisma, user.id)
    expect(settings).toHaveLength(0)
  })

  it('creates a visibility setting via updateVisibility', async () => {
    const { user, category } = await setup()
    const result = await updateVisibility(prisma, user.id, category.id, 'BUSY_ONLY')
    expect(result.displayMode).toBe('BUSY_ONLY')
    expect(result.userId).toBe(user.id)
    expect(result.categoryId).toBe(category.id)
  })

  it('updates an existing visibility setting', async () => {
    const { user, category } = await setup()
    await updateVisibility(prisma, user.id, category.id, 'BUSY_ONLY')
    const updated = await updateVisibility(prisma, user.id, category.id, 'HIDDEN')
    expect(updated.displayMode).toBe('HIDDEN')

    const all = await prisma.categoryVisibility.findMany({ where: { userId: user.id } })
    expect(all).toHaveLength(1)
  })

  it('returns all visibility settings for a user', async () => {
    const { user, category } = await setup()
    const cat2 = await prisma.category.create({ data: { name: 'Social', displayOrder: 3 } })
    await updateVisibility(prisma, user.id, category.id, 'BUSY_ONLY')
    await updateVisibility(prisma, user.id, cat2.id, 'HIDDEN')
    const settings = await getVisibilitySettings(prisma, user.id)
    expect(settings).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npm test --workspace packages/core
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the visibility service**

Create `packages/core/src/label-mapper/visibility.ts`:

```typescript
import type { PrismaClient, CategoryVisibility } from '@spont/db'
import { AppError } from '../errors'

export async function getVisibilitySettings(
  prisma: PrismaClient,
  userId: string,
): Promise<CategoryVisibility[]> {
  return prisma.categoryVisibility.findMany({
    where: { userId },
    include: { category: true },
  })
}

export async function updateVisibility(
  prisma: PrismaClient,
  userId: string,
  categoryId: string,
  displayMode: 'CATEGORY_NAME' | 'BUSY_ONLY' | 'HIDDEN',
): Promise<CategoryVisibility> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) throw new AppError('NOT_FOUND', 'Category not found')

  return prisma.categoryVisibility.upsert({
    where: { userId_categoryId: { userId, categoryId } },
    create: { userId, categoryId, displayMode },
    update: { displayMode },
  })
}
```

- [ ] **Step 4: Add export to barrel**

Add to `packages/core/src/index.ts`:

```typescript
export * from './label-mapper/visibility'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npm test --workspace packages/core
```

Expected: All visibility tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && git add packages/core/src/label-mapper/visibility.ts packages/core/src/label-mapper/visibility.test.ts packages/core/src/index.ts && git commit -m "feat: add category visibility service"
```

---

### Task 5: API routes — Label mappings and category visibility

**Files:**
- Create: `apps/web/app/api/label-mappings/route.ts`
- Create: `apps/web/app/api/label-mappings/[rawLabel]/route.ts`
- Create: `apps/web/app/api/category-visibility/route.ts`
- Create: `apps/web/app/api/category-visibility/[categoryId]/route.ts`
- Modify: `apps/web/lib/api-error.ts` (no new codes needed, existing mapping covers NOT_FOUND)

**Interfaces:**
- Consumes: `ensureMappings`, `overrideMapping`, `resetMapping`, `getVisibilitySettings`, `updateVisibility` from `@spont/core`; `getCurrentUserId` from `@/lib/session`; `toErrorResponse` from `@/lib/api-error`
- Produces: REST endpoints per spec

- [ ] **Step 1: Create GET /api/label-mappings**

Create `apps/web/app/api/label-mappings/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { ensureMappings } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'

export async function GET() {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const mappings = await ensureMappings(prisma, userId)
  return NextResponse.json({ mappings })
}
```

- [ ] **Step 2: Create PUT and DELETE /api/label-mappings/[rawLabel]**

Create `apps/web/app/api/label-mappings/[rawLabel]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { overrideMapping, resetMapping } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function PUT(
  request: NextRequest,
  { params }: { params: { rawLabel: string } },
) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const { categoryId } = await request.json()
  const rawLabel = decodeURIComponent(params.rawLabel)
  try {
    const mapping = await overrideMapping(prisma, userId, rawLabel, categoryId)
    return NextResponse.json({ mapping })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { rawLabel: string } },
) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const rawLabel = decodeURIComponent(params.rawLabel)
  try {
    const mapping = await resetMapping(prisma, userId, rawLabel)
    return NextResponse.json({ mapping })
  } catch (err) {
    return toErrorResponse(err)
  }
}
```

- [ ] **Step 3: Create GET /api/category-visibility**

Create `apps/web/app/api/category-visibility/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { getVisibilitySettings } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'

export async function GET() {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const categories = await prisma.category.findMany({ orderBy: { displayOrder: 'asc' } })
  const visibility = await getVisibilitySettings(prisma, userId)
  return NextResponse.json({ categories, visibility })
}
```

- [ ] **Step 4: Create PUT /api/category-visibility/[categoryId]**

Create `apps/web/app/api/category-visibility/[categoryId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { updateVisibility } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function PUT(
  request: NextRequest,
  { params }: { params: { categoryId: string } },
) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const { displayMode } = await request.json()
  try {
    const result = await updateVisibility(prisma, userId, params.categoryId, displayMode)
    return NextResponse.json({ visibility: result })
  } catch (err) {
    return toErrorResponse(err)
  }
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && git add apps/web/app/api/label-mappings/ apps/web/app/api/category-visibility/ && git commit -m "feat: add API routes for label mappings and category visibility"
```

---

### Task 6: Settings page — My Labels and Privacy sections

**Files:**
- Modify: `apps/web/app/settings/page.tsx` (replace shell with real content)
- Create: `apps/web/app/settings/settings-client.tsx`

**Interfaces:**
- Consumes: `GET /api/label-mappings`, `PUT /api/label-mappings/[rawLabel]`, `DELETE /api/label-mappings/[rawLabel]`, `GET /api/category-visibility`, `PUT /api/category-visibility/[categoryId]`
- Produces: Settings page with "My Labels" and "Privacy" sections

- [ ] **Step 1: Update the Settings server page to load data**

Replace `apps/web/app/settings/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { ensureMappings, getVisibilitySettings } from '@spont/core'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) redirect('/login')

  const categories = await prisma.category.findMany({ orderBy: { displayOrder: 'asc' } })
  const mappings = await ensureMappings(prisma, userId)
  const visibility = await getVisibilitySettings(prisma, userId)

  return (
    <SettingsClient
      user={{ name: user.name, email: user.email }}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      initialMappings={mappings.map((m) => ({
        rawLabel: m.rawLabel,
        categoryId: m.categoryId,
        categoryName: (m as any).category?.name ?? '',
        source: m.source,
      }))}
      initialVisibility={visibility.map((v) => ({
        categoryId: v.categoryId,
        displayMode: v.displayMode,
      }))}
    />
  )
}
```

- [ ] **Step 2: Create the Settings client component**

Create `apps/web/app/settings/settings-client.tsx`:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Category = { id: string; name: string }
type MappingRow = { rawLabel: string; categoryId: string; categoryName: string; source: string }
type VisibilityRow = { categoryId: string; displayMode: string }

export function SettingsClient({
  user,
  categories,
  initialMappings,
  initialVisibility,
}: {
  user: { name: string; email: string }
  categories: Category[]
  initialMappings: MappingRow[]
  initialVisibility: VisibilityRow[]
}) {
  const router = useRouter()
  const [mappings, setMappings] = useState(initialMappings)
  const [visibility, setVisibility] = useState(initialVisibility)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleOverride(rawLabel: string, categoryId: string) {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/label-mappings/${encodeURIComponent(rawLabel)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Something went wrong')
      setPending(false)
      return
    }
    setPending(false)
    router.refresh()
  }

  async function handleReset(rawLabel: string) {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/label-mappings/${encodeURIComponent(rawLabel)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Something went wrong')
      setPending(false)
      return
    }
    setPending(false)
    router.refresh()
  }

  async function handleVisibilityChange(categoryId: string, displayMode: string) {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/category-visibility/${categoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayMode }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error?.message ?? 'Something went wrong')
      setPending(false)
      return
    }
    setPending(false)
    router.refresh()
  }

  const visibilityMap = new Map(visibility.map((v) => [v.categoryId, v.displayMode]))

  return (
    <main>
      <h1>Settings</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <section>
        <h2>Profile</h2>
        <dl>
          <dt>Name</dt>
          <dd>{user.name}</dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </dl>
      </section>

      <section>
        <h2>My Labels</h2>
        <table>
          <thead>
            <tr>
              <th>Raw Label</th>
              <th>Category</th>
              <th>Source</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m) => (
              <tr key={m.rawLabel}>
                <td>{m.rawLabel}</td>
                <td>
                  <select
                    value={m.categoryId}
                    disabled={pending}
                    onChange={(e) => handleOverride(m.rawLabel, e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{m.source === 'MANUAL' ? 'custom' : 'auto'}</td>
                <td>
                  {m.source === 'MANUAL' && (
                    <button disabled={pending} onClick={() => handleReset(m.rawLabel)}>
                      Reset to suggested
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Privacy</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Visibility</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>
                  <select
                    value={visibilityMap.get(c.id) ?? 'CATEGORY_NAME'}
                    disabled={pending}
                    onChange={(e) => handleVisibilityChange(c.id, e.target.value)}
                  >
                    <option value="CATEGORY_NAME">Show category name</option>
                    <option value="BUSY_ONLY">Show as Busy</option>
                    <option value="HIDDEN">Hide completely</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Verify the page renders**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npm run dev
```

Visit `http://localhost:3000/settings` — log in as a seed user, verify:
- Profile section shows name and email
- My Labels table shows 5 labels with category dropdowns and "auto" source
- Privacy table shows 7 categories with visibility dropdowns
- Changing a category dropdown triggers the override API and shows "custom"
- Reset button appears for manual overrides

- [ ] **Step 4: Commit**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && git add apps/web/app/settings/ && git commit -m "feat: add My Labels and Privacy sections to Settings page"
```

---

### Task 7: Schedule page — Own schedule and friend's privacy-filtered view

**Files:**
- Create: `apps/web/app/schedule/page.tsx`
- Create: `apps/web/app/schedule/schedule-client.tsx`
- Create: `apps/web/app/api/schedule/route.ts`
- Create: `apps/web/app/api/schedule/[userId]/route.ts`
- Create: `apps/web/app/friends/[friendId]/schedule/page.tsx`
- Create: `apps/web/app/friends/[friendId]/schedule/friend-schedule-client.tsx`
- Modify: `apps/web/app/layout.tsx` (add Schedule to nav)

**Interfaces:**
- Consumes: `MockCalendarProvider`, `ensureMappings`, `getVisibilitySettings`, `filterEventsForViewer`, `listFriends` from `@spont/core`; `prisma` from `@spont/db`
- Produces: `/schedule` page, `/friends/[friendId]/schedule` page, `GET /api/schedule`, `GET /api/schedule/[userId]`

- [ ] **Step 1: Create GET /api/schedule (own events)**

Create `apps/web/app/api/schedule/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { MockCalendarProvider, ensureMappings } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'

export async function GET(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const url = new URL(request.url)
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')
  if (!start || !end) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'start and end query params required' } },
      { status: 400 },
    )
  }

  const account = await prisma.calendarAccount.findFirst({ where: { userId } })
  if (!account) {
    return NextResponse.json({ events: [] })
  }

  const provider = new MockCalendarProvider(prisma)
  const blocks = await provider.listBusyBlocks(account.id, {
    start: new Date(start),
    end: new Date(end),
  })

  const mappings = await ensureMappings(prisma, userId)
  const mappingByLabel = new Map(mappings.map((m) => [m.rawLabel, m]))

  const events = blocks.map((b) => {
    const mapping = b.rawLabel ? mappingByLabel.get(b.rawLabel) : null
    return {
      start: b.start,
      end: b.end,
      title: b.rawLabel,
      categoryName: mapping ? (mapping as any).category?.name ?? 'Other' : 'Other',
    }
  })

  return NextResponse.json({ events })
}
```

- [ ] **Step 2: Create GET /api/schedule/[userId] (friend's privacy-filtered view)**

Create `apps/web/app/api/schedule/[userId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import {
  MockCalendarProvider,
  ensureMappings,
  getVisibilitySettings,
  filterEventsForViewer,
  listFriends,
} from '@spont/core'
import { getCurrentUserId } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  const currentUserId = getCurrentUserId()
  if (!currentUserId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const friends = await listFriends(prisma, currentUserId)
  const isFriend = friends.some((f) => f.id === params.userId)
  if (!isFriend) {
    return NextResponse.json(
      { error: { code: 'NOT_AUTHORIZED', message: 'Not friends with this user' } },
      { status: 403 },
    )
  }

  const url = new URL(request.url)
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')
  if (!start || !end) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'start and end query params required' } },
      { status: 400 },
    )
  }

  const account = await prisma.calendarAccount.findFirst({ where: { userId: params.userId } })
  if (!account) {
    return NextResponse.json({ events: [] })
  }

  const provider = new MockCalendarProvider(prisma)
  const blocks = await provider.listBusyBlocks(account.id, {
    start: new Date(start),
    end: new Date(end),
  })

  const mappings = await ensureMappings(prisma, params.userId)
  const visibility = await getVisibilitySettings(prisma, params.userId)
  const viewable = filterEventsForViewer(blocks, mappings as any, visibility as any)

  return NextResponse.json({ events: viewable })
}
```

- [ ] **Step 3: Create the own-schedule page**

Create `apps/web/app/schedule/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { ScheduleClient } from './schedule-client'

export default async function SchedulePage() {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  return <ScheduleClient />
}
```

- [ ] **Step 4: Create the own-schedule client component**

Create `apps/web/app/schedule/schedule-client.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'

type ScheduleEvent = {
  start: string
  end: string
  title: string | null
  categoryName: string
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 7)
  return d
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function ScheduleClient() {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    now.setDate(now.getDate() + weekOffset * 7)
    const start = startOfWeek(now)
    const end = endOfWeek(now)

    setLoading(true)
    fetch(`/api/schedule?start=${start.toISOString()}&end=${end.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events ?? [])
        setLoading(false)
      })
  }, [weekOffset])

  return (
    <main>
      <h1>My Schedule</h1>
      <div>
        <button onClick={() => setWeekOffset((w) => w - 1)}>Previous week</button>
        <button onClick={() => setWeekOffset(0)}>This week</button>
        <button onClick={() => setWeekOffset((w) => w + 1)}>Next week</button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : events.length === 0 ? (
        <p>No events this week.</p>
      ) : (
        <ul>
          {events.map((e, i) => (
            <li key={i}>
              <strong>{formatDate(e.start)}</strong>{' '}
              {formatTime(e.start)} – {formatTime(e.end)}{' '}
              | {e.title ?? 'Untitled'}{' '}
              <span>[{e.categoryName}]</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 5: Create the friend schedule page**

Create `apps/web/app/friends/[friendId]/schedule/page.tsx`:

```typescript
import { redirect, notFound } from 'next/navigation'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@spont/db'
import { listFriends } from '@spont/core'
import { FriendScheduleClient } from './friend-schedule-client'

export default async function FriendSchedulePage({ params }: { params: { friendId: string } }) {
  const userId = getCurrentUserId()
  if (!userId) redirect('/login')

  const friends = await listFriends(prisma, userId)
  const friend = friends.find((f) => f.id === params.friendId)
  if (!friend) notFound()

  return <FriendScheduleClient friendId={friend.id} friendName={friend.name} />
}
```

- [ ] **Step 6: Create the friend schedule client component**

Create `apps/web/app/friends/[friendId]/schedule/friend-schedule-client.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'

type ViewableEvent = {
  start: string
  end: string
  label: string | null
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 7)
  return d
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function FriendScheduleClient({
  friendId,
  friendName,
}: {
  friendId: string
  friendName: string
}) {
  const [events, setEvents] = useState<ViewableEvent[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    now.setDate(now.getDate() + weekOffset * 7)
    const start = startOfWeek(now)
    const end = endOfWeek(now)

    setLoading(true)
    setError(null)
    fetch(`/api/schedule/${friendId}?start=${start.toISOString()}&end=${end.toISOString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          setError(body?.error?.message ?? 'Something went wrong')
          setLoading(false)
          return
        }
        const data = await res.json()
        setEvents(data.events ?? [])
        setLoading(false)
      })
  }, [weekOffset, friendId])

  return (
    <main>
      <h1>{friendName}&apos;s Schedule</h1>
      <div>
        <button onClick={() => setWeekOffset((w) => w - 1)}>Previous week</button>
        <button onClick={() => setWeekOffset(0)}>This week</button>
        <button onClick={() => setWeekOffset((w) => w + 1)}>Next week</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : events.length === 0 ? (
        <p>No events this week.</p>
      ) : (
        <ul>
          {events.map((e, i) => (
            <li key={i}>
              <strong>{formatDate(e.start)}</strong>{' '}
              {formatTime(e.start)} – {formatTime(e.end)}{' '}
              | {e.label ?? 'Busy'}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 7: Add Schedule link to nav and "View schedule" link to friends list**

In `apps/web/app/layout.tsx`, add the Schedule link to the nav (after Groups, before Notifications):

```typescript
<Link href="/schedule">Schedule</Link>
```

- [ ] **Step 8: Add "View schedule" links to the friends page**

In `apps/web/app/friends/friends-client.tsx`, add a Link import and update the accepted friends list to include schedule links:

Add import at top:
```typescript
import Link from 'next/link'
```

In the "Your friends" section, change the list item from:
```typescript
<li key={u.id}>{u.name}</li>
```
to:
```typescript
<li key={u.id}>
  {u.name}{' '}
  <Link href={`/friends/${u.id}/schedule`}>View schedule</Link>
</li>
```

- [ ] **Step 9: Verify pages render**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npm run dev
```

Verify:
- `http://localhost:3000/schedule` shows own events with titles and category badges
- Friends page shows "View schedule" links
- Clicking a friend's schedule link shows privacy-filtered events (no titles)
- Nav includes "Schedule" link

- [ ] **Step 10: Commit**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && git add apps/web/app/schedule/ apps/web/app/api/schedule/ apps/web/app/friends/ apps/web/app/layout.tsx && git commit -m "feat: add Schedule page with own view and friend's privacy-filtered view"
```

---

### Task 8: Run full test suite and fix any issues

**Files:**
- Potentially modify: any files with test failures

**Interfaces:**
- Consumes: all previous tasks
- Produces: green test suite

- [ ] **Step 1: Run the full test suite**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npm test
```

Expected: All tests pass. If any fail, fix them.

- [ ] **Step 2: Run the linter**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npm run lint
```

Expected: No lint errors. Fix any that appear.

- [ ] **Step 3: Reseed the database and verify end-to-end**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && npm run db:seed
```

Then start the dev server and manually verify:
1. Log in as Alice
2. Go to Settings → see 5 labels mapped, 7 categories with visibility controls
3. Override "Gym" from Health/Fitness to Social → source shows "custom"
4. Reset "Gym" → goes back to Health/Fitness with "auto"
5. Set Work to "Hide completely" in Privacy
6. Go to Schedule → see all events with categories
7. Go to Friends → add Bob as friend (accept as Bob), then view Bob's schedule
8. Bob's Work events should be hidden (if Bob set Work to HIDDEN)

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
cd /Users/rthirumulu/src/nba-props-agent/spont_app && git add -A && git commit -m "fix: address test and lint issues from label taxonomy integration"
```
