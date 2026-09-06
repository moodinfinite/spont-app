# Spont App — Phase 2: Label Taxonomy Design

Status: Approved for implementation planning
Date: 2026-09-06

## Summary

Phase 2 adds a label taxonomy system that maps each user's raw calendar labels into a fixed set of universal categories, with user override and privacy-scoped sharing. No AI/LLM dependency — mapping is rule-based with manual correction.

## Data Model

Three new tables. No changes to existing tables.

### Category

The 7 fixed universal categories, system-defined:

```
Category (id: String @id, name: String @unique, displayOrder: Int)
```

Seeded values (in display order): Work, Personal, Social, Health/Fitness, Family, Errands, Other.

### LabelMapping

Maps a user's raw calendar label to a category:

```
LabelMapping (id, userId, rawLabel, categoryId, source: 'rule'|'manual', createdAt, updatedAt)
@@unique([userId, rawLabel])
```

- One mapping per user per raw label — user A's "Gym" can map differently than user B's.
- `source` tracks origin: `rule` (auto-mapped by rule engine) or `manual` (user override).
- When a user overrides, source flips to `manual` and categoryId updates.

### CategoryVisibility

Per-user, per-category privacy control:

```
CategoryVisibility (id, userId, categoryId, displayMode: 'category_name'|'busy_only'|'hidden', createdAt, updatedAt)
@@unique([userId, categoryId])
```

- `category_name`: friends see time range + category name (e.g., "3-5pm: Work").
- `busy_only`: friends see "3-5pm: Busy".
- `hidden`: event is invisible to friends entirely.
- Default when no row exists: `category_name`.

## Core Logic — Label Mapper

New module at `packages/core/src/label-mapper/`.

### Rule-based mapper

Hardcoded lookup table, case-insensitive, substring matching:

| Raw label patterns | Category |
|---|---|
| Gym, Workout, Yoga, Run | Health/Fitness |
| Client Call, Meeting, Standup, 1:1 | Work |
| Date Night, Date | Personal |
| Family Dinner, Family | Family |
| Errands, Groceries, Dentist, Doctor | Errands |
| Happy Hour, Party, Hangout, Brunch | Social |

Unmatched labels map to "Other".

### Mapping orchestrator

Entry point for mapping a label for a given user:

1. Check `LabelMapping` table — if a manual override exists, return it.
2. Run rule-based mapper.
3. Persist result to `LabelMapping` with source `rule` (or `manual` if override).

Auto-mapping triggers when a user's labels are first loaded or new labels appear. Only unmapped labels get processed.

### Privacy filter

Pure function in core:

```ts
filterEventsForViewer(
  events: BusyBlock[],
  mappings: LabelMapping[],
  visibility: CategoryVisibility[]
): ViewableBlock[]
```

Single enforcement point for privacy. The web layer calls this; it never applies its own filtering logic.

## UI — Settings Page

The existing Settings shell gets two sections:

### "My Labels" section

- Table: Raw Label | Category (dropdown) | Source (badge: "auto" or "custom")
- Selecting a different category saves immediately, flips source to `manual`.
- "Reset to suggested" action per row re-runs the rule mapper and clears the override.
- Labels populated from the user's deduplicated `CalendarEvent.rawLabel` values.
- On first visit, unmapped labels auto-map through the rule engine.

### "Privacy" section

- Table: Category | Visibility (dropdown)
- One row per category (all 7 always shown).
- Dropdown options: "Show category name" | "Show as Busy" | "Hide completely".
- Defaults to "Show category name". Saves immediately on change.

### API routes

- `GET /api/label-mappings` — current user's mappings (triggers auto-mapping for unmapped).
- `PUT /api/label-mappings/[rawLabel]` — override a mapping.
- `DELETE /api/label-mappings/[rawLabel]` — reset to auto-suggested.
- `GET /api/category-visibility` — current user's visibility settings.
- `PUT /api/category-visibility/[categoryId]` — update a category's display mode.

## UI — Schedule View

### Own schedule (`/schedule`)

- Shows current user's events for the current week, navigable by week.
- Each event: time range | title | color-coded category badge.
- Full detail — the user sees everything.

### Friend's schedule (`/friends/[friendId]/schedule`)

- Accessible from Friends page — click a friend to view.
- Events filtered through `filterEventsForViewer`:
  - `category_name` → time range + category name
  - `busy_only` → time range + "Busy"
  - `hidden` → omitted
- No event titles or raw labels shown — ever.
- Returns 403 if not friends.

### API routes

- `GET /api/schedule?start=&end=` — own events with category info.
- `GET /api/schedule/[userId]?start=&end=` — privacy-filtered friend view.

### Navigation

"Schedule" added to main nav alongside Friends, Groups, Notifications, Settings.

## Testing

### Core tests (`packages/core`)

- Rule-based mapper: exact matches, substring matches, case insensitivity, unmatched maps to Other.
- Mapping orchestrator: manual override precedence, rule fallback, DB persistence.
- Privacy filter: all three display modes, missing visibility defaults to category_name.

### DB tests (`packages/db`)

- LabelMapping CRUD, unique constraint enforcement.
- CategoryVisibility CRUD, unique constraint enforcement.
- Category seed verification (7 rows).

### Web tests (`apps/web`)

- Settings "My Labels" renders, dropdown changes trigger PUT.
- Settings "Privacy" renders, dropdown changes trigger PUT.
- Schedule page renders own events with category badges.
- Friend schedule page shows filtered events, no titles.

## Seed data updates

- `seedDatabase` extended to create the 7 Category rows.
- Existing seed labels ("Gym", "Client Call", "Date Night", "Family Dinner", "Errands") auto-mapped via rule engine during seed.
- Default CategoryVisibility rows created per seed user (all `category_name`).

## Out of scope

- LLM-powered label classification (future consideration).
- Per-event category overrides (label-level only).
- Group schedule views (Phase 3 scheduling engine).
- Real calendar data (Phase 7).
