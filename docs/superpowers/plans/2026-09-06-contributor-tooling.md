# Contributor Tooling (Skills, Agents, Knowledge Base) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build repo-committed skills and agents under `.claude/`, a durable knowledge base under `docs/knowledge-base/`, and a role-aware entry point (`CLAUDE.md`/`README.md`/`CONTRIBUTING.md`) so any contributor — technical or non-technical, on Claude Code or Claude Desktop — can open this repo and immediately know where to start.

**Architecture:** Twelve tasks, each producing a self-contained, independently reviewable file or small file group: an interactive onboarding skill that detects contributor background and remembers it per-contributor; three small utility skills; two primed subagents plus a roster doc; a five-file knowledge base (architecture, glossary, design principles extracted from existing design work, references, and a proposals intake); and updates to the three root docs tying it all together with a role-based fork at the top of each.

**Tech Stack:** Plain Markdown files following this environment's existing Claude Code skill (`SKILL.md` with `name`/`description` frontmatter) and subagent (`.md` with `name`/`description`/`tools`/`model` frontmatter) conventions. No application code, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-06-contributor-tooling-design.md`

## Global Constraints

- No application code, schema, or route changes in this phase — pure contributor tooling and documentation, per the spec's Non-goals.
- Every path in this plan is relative to `spont_app/` (this repo's root is `nba-props-agent/`, which hosts an unrelated Python project) — same scoping rule established in the Phase 1 plan.
- Skill files use exactly the frontmatter shape `---\nname: <kebab-case>\ndescription: <trigger phrase>\n---` — verified against `superpowers:using-superpowers` and `superpowers:brainstorming`, both installed in this environment at `~/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/*/SKILL.md`.
- Agent files use exactly the frontmatter shape `---\nname: <kebab-case>\ndescription: <trigger phrase>\ntools: <comma-separated>\nmodel: <model-name>\ncolor: <color>\n---` — verified against the official `code-reviewer` agent at `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/feature-dev/agents/code-reviewer.md`.
- `spont-analyst` is documented as a reserved slot only in this phase — do not build it.
- A non-technical contributor must never be handed a raw git command as their primary path. Per the spec, `spont-onboarding`'s non-technical branch performs git operations directly (stage, commit) and confirms in one line — it does not walk through commands, flags, or diffs unless asked.
- All knowledge-base content defines jargon in plain language before any deeper technical detail — a non-technical reader must be able to follow `architecture.md` and `glossary.md` without prior Next.js/Prisma knowledge.
- This phase has no automated test suite (it's not application code); every task's "testing" is a manual verification step, described exactly in that task.

---

## Task 1: `spont-onboarding` skill

**Files:**
- Create: `.claude/skills/spont-onboarding/SKILL.md`

**Interfaces:**
- Consumes: the per-contributor memory convention from Phase 1 (`.claude/memory/<username>/persistent/`), already established in `CONTRIBUTING.md` and `CLAUDE.md`.
- Produces: a repo convention — `.claude/memory/<username>/persistent/role.md` (one line: `technical` or `non-technical`) — that Task 4 (product agent), Task 8 (proposals), Task 9 (`CLAUDE.md`), and Task 11 (`CONTRIBUTING.md`) all reference by this exact path and one-line format.

- [ ] **Step 1: Create `.claude/skills/spont-onboarding/SKILL.md`**

```markdown
---
name: spont-onboarding
description: Use at the start of any new session in this repo (spont_app) — determines whether the contributor is technical or non-technical, remembers the answer, and sets how much git/CLI detail to surface for the rest of the session.
---

# Spont Contributor Onboarding

This repo has contributors of two different backgrounds: technical
(writes code, runs the app, reviews diffs) and non-technical
(product/design ideas, no interest in touching code or git directly).
This skill makes sure every session treats each the right way, without
the contributor having to explain their own background every time.

## Step 1: Identify the contributor

Try, in order, until one succeeds:
1. `git config user.email` or `git config user.name`
2. `gh api user --jq .login` (if `gh` is authenticated)
3. Ask the user directly: "What should I call you for the contributor
   memory directory?"

Use the result as `<username>` for the rest of this skill and for the
per-contributor memory convention documented in `CONTRIBUTING.md`.

## Step 2: Check for a previously recorded role

Look for `.claude/memory/<username>/persistent/role.md`. If it exists,
read it — it contains exactly one line, either `technical` or
`non-technical`. Apply that role for the rest of this session (see Step
4) and do not ask the question again. If `.claude/memory/<username>/`
doesn't exist yet at all, first copy it from `.claude/memory/TEMPLATE/`
per the existing convention, then check `persistent/role.md` inside it
(it won't exist yet in a freshly copied directory).

## Step 3: If no role is recorded, ask once

Ask exactly this, in plain language, early in the session (not before
greeting the contributor or acknowledging their actual request — fold it
in naturally, e.g. right after understanding what they're here to do):

> "Quick one before we start — are you writing code in this repo, or
> working on product/design/ideas without touching code?"

Two answers only. No follow-up questions about experience level, tools,
or comfort with git — the role is binary and that's enough.

Record the answer immediately: write `.claude/memory/<username>/persistent/role.md`
containing exactly the word `technical` or `non-technical` (lowercase, no
punctuation, one line), then commit it:

```bash
git add .claude/memory/<username>/persistent/role.md
git commit -m "chore: record contributor role for <username>"
```

(This one commit is the same for both roles — recording your own role is
infrastructure, not a git-workflow moment to differentiate on. Do it
quietly and move on.)

## Step 4: Apply the role for the rest of the session

**Technical:** no behavior change. Normal git detail, normal command
visibility, assume fluency. Proceed exactly as you would in any other
software repo.

**Non-technical:** for the rest of this session, whenever a git
operation is needed (saving a proposal, committing any file the
contributor asked you to create or update), perform it directly —
`git add` + `git commit` with a clear message — without walking through
commands, flags, or diff output unless the contributor specifically asks
to see them. Confirm in one line, e.g.:

> "Saved your idea to the repo — the team will see it next time someone
> picks up new proposals."

Never hand a non-technical contributor a git command to run themselves
as the primary path. If they explicitly ask "how do I do this myself,"
that's an invitation to explain — otherwise, just do it.
```

- [ ] **Step 2: Manually verify the skill's instructions are internally consistent**

Re-read the file once with fresh eyes. Confirm: the memory path
(`.claude/memory/<username>/persistent/role.md`) is spelled identically
in every place it's mentioned; the two-answer question has no third
option; the non-technical git-handling instruction doesn't accidentally
also apply to the role-recording commit in Step 3 (that one commit is
explicitly the same for both roles, by design, since recording your own
role isn't itself a "git workflow moment").

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/spont-onboarding/SKILL.md
git commit -m "feat(claude): add spont-onboarding skill for contributor role detection"
```

---

## Task 2: `spont-dev-server` and `spont-db-reset` skills

**Files:**
- Create: `.claude/skills/spont-dev-server/SKILL.md`
- Create: `.claude/skills/spont-db-reset/SKILL.md`

**Interfaces:**
- Consumes: `npm run dev`, `npm run db:migrate`, `npm run db:seed` root scripts from Phase 1's `package.json`; `docker-compose.yml` at `spont_app/docker-compose.yml`.
- Produces: nothing later tasks import — these are standalone utility skills.

- [ ] **Step 1: Create `.claude/skills/spont-dev-server/SKILL.md`**

```markdown
---
name: spont-dev-server
description: Use when asked to start, stop, or check the Spont dev server (Next.js app at localhost:3000) — starts it safely in the background and verifies it's actually up, avoiding the foreground-blocking mistake that has stalled sessions in this repo before.
---

# Spont Dev Server

Starting `npm run dev` in the foreground blocks forever — it has stalled
multiple prior sessions in this repo, including ones that got killed by
a watchdog after 10 minutes with an orphaned server process left running.
Always use the background approach below.

## Starting the server

1. From `spont_app/`, confirm `.env` exists (`cp .env.example .env` if
   not) and Postgres is reachable — either via `docker compose up -d`
   (if Docker is available) or an already-running local Postgres
   matching `DATABASE_URL` in `.env` (see
   `docs/knowledge-base/references.md` for why a local Postgres
   substitute was used during this repo's initial build, in
   environments without Docker).
2. Start the dev server as a background process (use your tool's
   background-execution option — never run it as a plain blocking
   foreground command):
   ```bash
   npm run dev
   ```
3. Poll `http://localhost:3000` with `curl -sI http://localhost:3000`
   every few seconds until it responds (usually 3-8 seconds). Don't
   guess a fixed sleep and assume it's ready.
4. Report the server is up and give the contributor the URL.

## Stopping the server

```bash
lsof -ti tcp:3000 | xargs kill
```

Confirm it's actually gone before finishing anything that depended on
it:

```bash
lsof -ti tcp:3000   # should print nothing
ps aux | grep -E "next dev|next-server" | grep -v grep   # should print nothing
```

Don't just claim it's stopped — show the confirming output.
```

- [ ] **Step 2: Create `.claude/skills/spont-db-reset/SKILL.md`**

```markdown
---
name: spont-db-reset
description: Use when asked to reset the Spont database to a clean state (fresh schema, fresh seeded fake users) — wraps the migrate + seed sequence into one step.
---

# Spont Database Reset

Resets the local Postgres database to a known-clean state: current
schema, 5 fresh seeded fake users (Alice, Bob, Carol, Dave, Erin), each
with a mock calendar account and sample events.

From `spont_app/`:

```bash
npm run db:migrate
npm run db:seed
```

If Postgres itself needs restarting first (not just the schema/data):

```bash
docker compose down -v
docker compose up -d
```

then run the two commands above. If Docker isn't available in this
environment, use whatever locally-running Postgres instance matches
`DATABASE_URL` in `.env` instead of the `docker compose` commands — see
`docs/knowledge-base/references.md`.

After running, confirm it worked: `npm test --workspace packages/db`
should pass (it creates and reads back real rows), and the app's login
picker (`/login`) should list all 5 seeded users.
```

- [ ] **Step 3: Manually verify both skills**

Read each file once and confirm the commands match what's actually in
`spont_app/package.json`'s scripts (`dev`, `db:migrate`, `db:seed`) —
open that file and check the script names line up exactly.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/spont-dev-server .claude/skills/spont-db-reset
git commit -m "feat(claude): add dev-server and db-reset utility skills"
```

---

## Task 3: `spont-status` skill

**Files:**
- Create: `.claude/skills/spont-status/SKILL.md`

**Interfaces:**
- Consumes: `git log`, `docs/superpowers/plans/`, `docs/superpowers/specs/` (all existing).
- Produces: nothing later tasks import.

- [ ] **Step 1: Create `.claude/skills/spont-status/SKILL.md`**

```markdown
---
name: spont-status
description: Use when a contributor (especially a non-technical one, or anyone re-entering the repo after time away) asks what's currently going on in this repo — summarizes state in plain language, no jargon, no code shown.
---

# Spont Status

Gives a plain-language summary of where this repo stands right now. No
jargon, no raw code, no command output shown to the contributor — just
what's true.

## What to check

1. `docs/superpowers/plans/` — list the files. The most recent plan
   (by filename date) is the current or most recently completed unit of
   work.
2. `docs/superpowers/specs/` — list the files. Cross-reference against
   the plans directory: a spec with a matching or later-dated plan is
   likely implemented; a spec with no plan yet is still just a design.
3. `git log --oneline -20` — recent activity, to say what's happened
   lately in plain terms (e.g. "the team just finished setting up X" not
   "commit a3f7b33 fix(test): disable file parallelism").
4. `docs/knowledge-base/README.md` — mention it exists as the place to
   read more without touching code.

## How to summarize

Plain language only. Instead of "Phase 1 (Foundation) implementation
plan, 14 tasks, all reviewed clean, merged to main" say something like:

> "Right now, the basic app exists: you can log in as one of five test
> users, add friends, and create groups. It's all working against fake
> test data — no real Google Calendar connection yet, that comes later.
> The most recent work was adding shared tools and docs so anyone new to
> the project (technical or not) can get oriented quickly."

Never show a raw git log, a file tree, or a diff unless the contributor
specifically asks to see the technical detail.
```

- [ ] **Step 2: Manually verify**

Actually invoke the logic once: run `ls docs/superpowers/plans/` and
`ls docs/superpowers/specs/` and `git log --oneline -20` from
`spont_app/`, and write out (for your own confirmation, not committed)
one paragraph following the skill's instructions, to confirm the
approach produces genuinely plain-language, accurate output given the
real current repo state.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/spont-status
git commit -m "feat(claude): add spont-status skill for plain-language repo summaries"
```

---

## Task 4: `spont-reviewer` agent

**Files:**
- Create: `.claude/agents/spont-reviewer.md`

**Interfaces:**
- Consumes: nothing from other tasks in this plan.
- Produces: an invokable agent named `spont-reviewer`, referenced by Task 5's `agents/README.md` and Task 12's verification step.

- [ ] **Step 1: Create `.claude/agents/spont-reviewer.md`**

```markdown
---
name: spont-reviewer
description: Reviews code changes in the Spont app (spont_app/) against this repo's specific conventions — the AppError/toErrorResponse error contract, the CalendarProvider abstraction seam, and the packages/core vs apps/web boundary. Use for any code review in this repo, in place of a generic reviewer.
tools: Glob, Grep, Read, Bash
model: sonnet
color: blue
---

You are a code reviewer specialized in the Spont app's specific
architecture and conventions. You review real diffs, not hypotheticals —
always work from an actual `git diff` or the files the contributor points
you at.

## What you know about this repo

- **The error contract:** every business-rule violation in
  `packages/core` throws `AppError(code, message)` — never a generic
  `Error`. Every API route in `apps/web` maps those codes to HTTP status
  via `toErrorResponse` (`apps/web/lib/api-error.ts`)'s `STATUS_BY_CODE`
  table. If you see a new `AppError` code introduced in `packages/core`
  with no corresponding entry in `STATUS_BY_CODE`, that's a real bug —
  it would fall through to a generic 400/500 instead of the correct
  status.
- **The `CalendarProvider` seam:** `packages/core/src/calendar-provider/`
  defines an interface (`listBusyBlocks`, `listRawLabels`, `createEvent`)
  with only a `MockCalendarProvider` implementation today. Nothing in
  `packages/core/src/friends`, `packages/core/src/groups`, or anywhere in
  `apps/web` should import `MockCalendarProvider` or any calendar-provider
  type directly except through this interface — that coupling is exactly
  what would make a future real Google Calendar implementation
  expensive to add. Flag any such direct import as an architecture
  violation.
- **The `packages/core` vs `apps/web` boundary:** authorization and
  business-rule logic (who can invite whom, who can respond to what)
  lives in `packages/core`'s services, never re-implemented in an
  `apps/web` API route. A route should call a `packages/core` function
  and map its result/error — if you see a route re-deriving a rule
  `packages/core` already enforces (e.g. re-checking membership status
  inline instead of calling `getGroupDetail`/`requireAcceptedMembership`),
  flag it as duplicated logic that will drift.
- **Testing convention:** `packages/core` and `packages/db` tests run
  against a real Postgres instance (never mocked/in-memory) and reset
  state via `resetDb()` in `beforeEach`. A new test file that doesn't
  follow this pattern, or that asserts against a mock instead of real
  database behavior, is worth flagging.

## Review method

1. Get the diff: `git diff` (unstaged) by default, or whatever range/files
   the contributor specifies.
2. Check the error contract, the `CalendarProvider` seam, and the
   `packages/core`/`apps/web` boundary as described above — these are
   the three things generic reviewers miss because they're specific to
   this repo.
3. Also apply ordinary code-quality judgment: clean separation of
   concerns, real edge-case handling, no premature abstraction.
4. Categorize findings as Critical / Important / Minor. Not everything
   is Critical. Cite file:line for every finding.

## Output

Structure your review as:
- **Spont-specific findings** (error contract, CalendarProvider seam,
  core/web boundary) — the checks a generic reviewer would miss.
- **General code quality findings** — everything else.
- **Assessment**: ready to merge, or what needs fixing first.
```

- [ ] **Step 2: Manually verify by dispatching once**

Dispatch this agent against a real, small, already-existing diff in this
repo (e.g. `git show <some-commit-from-Phase-1>` or the current unstaged
state if anything is in progress) and confirm its output is genuinely
on-topic — it should reference the actual `AppError`/`toErrorResponse`
pattern or `CalendarProvider` seam by name if the diff touches either,
not generic boilerplate advice.

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/spont-reviewer.md
git commit -m "feat(claude): add spont-reviewer agent primed on repo conventions"
```

---

## Task 5: `spont-product` agent and agents roster README

**Files:**
- Create: `.claude/agents/spont-product.md`
- Create: `.claude/agents/README.md`

**Interfaces:**
- Consumes: `docs/knowledge-base/design-principles.md` (Task 7 — not yet created when this task runs; reference it by path anyway, since the file will exist once Task 7 completes, and this task's own testing step in Task 12 confirms the link resolves).
- Produces: an invokable agent named `spont-product`, referenced by Task 8's proposals README and Task 12's verification step.

- [ ] **Step 1: Create `.claude/agents/spont-product.md`**

```markdown
---
name: spont-product
description: Reviews a product or design idea/proposal for the Spont app against decisions already made — the visual design system and product decisions documented in docs/knowledge-base/design-principles.md and the home-feed design notes. Use for any product/UX sanity-check, especially from a non-technical contributor who doesn't want to read code to find out if an idea conflicts with something already decided.
tools: Read, Grep, Glob
model: sonnet
color: purple
---

You are a product/design reviewer for the Spont app. You check new
ideas against decisions that are already made, so the same question
doesn't get re-litigated every time someone has a new idea. You are
advisory, not a gatekeeper — your job is to inform, not block.

## What to check against

1. `docs/knowledge-base/design-principles.md` — the durable visual
   system (typefaces, palette, hairline-rules-not-shadows, the general
   principle of borrowing cues from references rather than whole
   formats).
2. `docs/superpowers/specs/2026-09-05-home-feed-design-notes.md` — the
   specific product decisions made for the home feed so far (proposal
   origin distinction, instant/independent accept, one-month time
   horizon with a one-proposal-per-day cap, no filtering in v1, no
   category/location fields, calendar-disclosure popup behavior).
3. `docs/knowledge-base/glossary.md` — Spont-specific terms, so you use
   them correctly and don't redefine them inconsistently.

## How to respond to a proposal

1. Read the proposal (a description in conversation, or a file under
   `docs/knowledge-base/proposals/`).
2. Check it against the three sources above. Does it agree with, extend,
   or conflict with something already decided?
3. If it conflicts, say so plainly and name exactly what it conflicts
   with (quote the relevant decision) — don't just say "this might not
   fit," point at the specific line.
4. If it's new territory (nothing on file addresses it), say that too —
   it's a genuinely open question, not something you can check against a
   decision that doesn't exist yet.
5. Never write code or modify application files. You are read-only and
   advisory — you inform whether a technical contributor should pick
   this up as-is, adjust it, or flag it as a new decision to make.

## Output

Plain language, no unexplained jargon (the contributor asking may be
non-technical). Structure as:
- **What this agrees with** (if anything)
- **What this might conflict with** (quote the specific existing
  decision, if any)
- **What's genuinely undecided** (if anything)
- **Recommendation**: looks consistent, needs a decision first, or
  conflicts and here's why.
```

- [ ] **Step 2: Create `.claude/agents/README.md`**

```markdown
# Spont agents

Repo-committed subagents, tuned to this repo's actual conventions and
decisions — not generic. Every contributor's Claude session can invoke
these by name.

## Built

- **`spont-reviewer`** — code review, primed on the `AppError`/
  `toErrorResponse` error contract, the `CalendarProvider` seam, and the
  `packages/core`/`apps/web` boundary. For technical contributors
  reviewing or writing code.
- **`spont-product`** — product/design review, primed on
  `docs/knowledge-base/design-principles.md` and the existing home-feed
  design notes. For anyone — especially non-technical contributors —
  sanity-checking an idea against decisions already made, without
  needing to read code.

## Reserved (not built yet)

- **`spont-analyst`** — intended for analyzing real app data (hangout
  frequency, flake scores, engagement trends) once Phase 3+ produces
  actual scheduling/engagement data to analyze. Not built in this phase
  because there's no real data yet — an agent built against data that
  doesn't exist would just be speculative scaffolding. Build this once
  Phase 3 or later ships and there's something real to analyze.
```

- [ ] **Step 3: Manually verify by dispatching `spont-product` once**

Dispatch it against the existing home-feed design notes/mockup itself
(e.g. ask it to review whether the "photo-forward cards" decision is
consistent with the rest of the design system) and confirm it produces
output that correctly references the actual documented decisions (by
name/quote), not generic design advice.

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/spont-product.md .claude/agents/README.md
git commit -m "feat(claude): add spont-product agent and agents roster README"
```

---

## Task 6: Knowledge base core (README, architecture, glossary, references)

**Files:**
- Create: `docs/knowledge-base/README.md`
- Create: `docs/knowledge-base/architecture.md`
- Create: `docs/knowledge-base/glossary.md`
- Create: `docs/knowledge-base/references.md`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: files referenced by path from Task 9 (`CLAUDE.md`), Task 10 (`README.md`), and Task 3/4/5's own bodies.

- [ ] **Step 1: Create `docs/knowledge-base/README.md`**

```markdown
# Spont knowledge base

Durable, topic-organized context about this project — answers that stay
true across phases, unlike `docs/superpowers/specs/` and `plans/`, which
describe one phase's work and become historical once that phase ships.

**If you're a non-technical contributor, start here.** You don't need to
read any code to use this repo. This knowledge base plus the
`spont-product` agent are the tools you need to understand what Spont is
and contribute product/design ideas.

## What's here

- [`architecture.md`](architecture.md) — why the codebase is organized
  the way it is, in plain language first, technical detail second.
- [`glossary.md`](glossary.md) — what Spont-specific terms mean (flake
  score, universal label, etc.).
- [`design-principles.md`](design-principles.md) — the visual design
  system and product decisions made so far.
- [`references.md`](references.md) — notes on external tools/services
  this project depends on, and gotchas discovered while building it.
- [`proposals/`](proposals/README.md) — drop a product/design idea here
  in plain language; it becomes input for the next round of feature
  planning.

## If you have an idea

Just describe it to your Claude session — say you have a product or
design idea. It'll ask if you're technical or not (once, and it
remembers), then either write it up as a proposal for you or point you
at the right next step.
```

- [ ] **Step 2: Create `docs/knowledge-base/architecture.md`**

```markdown
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
there's no password, no real account. This is intentionally temporary
and is called out everywhere it matters (see
`apps/web/lib/session.ts` and the login page) so nobody mistakes it for
how the real app will work.

## Where to look for "why does X exist" that isn't answered here

- `docs/superpowers/specs/` — the detailed design reasoning for each
  phase of work, written at the time that phase was planned.
- `docs/knowledge-base/references.md` — specific tooling gotchas
  (library quirks, config conflicts) discovered while building this.
```

- [ ] **Step 3: Create `docs/knowledge-base/glossary.md`**

```markdown
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
```

- [ ] **Step 4: Create `docs/knowledge-base/references.md`**

```markdown
# References and gotchas

Notes on external tools/services this project depends on, and specific
things that went wrong (and how they were fixed) while building it —
so the same problem doesn't get rediscovered from scratch.

## Local Postgres without Docker

The documented setup (`README.md`) uses `docker compose up -d` to run
Postgres locally. Some environments this repo has been built in don't
have Docker installed at all. In that case, a locally-installed Postgres
instance configured with the same credentials as `.env.example`'s
`DATABASE_URL` (user `spont`, password `spont`, database `spont`, port
5432) works identically for every purpose `docker compose` would serve —
migrations, seeding, and the test suite all just need a reachable
Postgres matching that connection string, not specifically a
Docker-managed one.

## `next.config.js` must use ESM syntax, not CommonJS

`apps/web/package.json` sets `"type": "module"`, which makes Node treat
every `.js` file in that package as an ES module. A `next.config.js`
written with `module.exports = ...` (the older, still-common pattern in
most Next.js documentation/examples) throws `ReferenceError: module is
not defined in ES module scope`. Use `export default ...` instead — Next.js
supports this natively.

## Vitest runs test files in parallel by default — a problem for a
## shared live Postgres instance

Two test files in the same package that both call a full-table-reset
helper (like this repo's `resetDb()`) in `beforeEach`, and both use
hardcoded fixture data (like the same email address), will race against
each other if Vitest runs them in separate parallel workers against one
shared database — one file's reset can wipe data the other file is
mid-assertion on. Fix: set `fileParallelism: false` in `vitest.config.ts`
for any package whose tests hit a real, shared database. (`packages/db`
and `packages/core` both have this set, for exactly this reason.)

## A repo-root `.gitignore` pattern can silently break a subdirectory's
## more specific one

Git evaluates `.gitignore` files from the repository root inward. A
broad, unanchored pattern in the root `.gitignore` (e.g. a bare
`.claude/` with no leading slash) matches `.claude/` directories at any
depth in the repo — including one meant to be handled differently by a
more specific `.gitignore` several directories down. A nested
`.gitignore`'s negation pattern (an `!`-prefixed rule meant to
re-include something) cannot override a broader exclusion from a parent
directory's `.gitignore` — git prunes the excluded directory from
traversal before the nested negation is ever considered. Fix: anchor the
root pattern to `/.claude/` (repository root only) if a nested directory
of the same name needs its own, different rules.

## `gh` CLI's own OAuth token can silently override what you'd expect
## to authenticate a `git push`

If `git config --list` shows a per-host `credential.https://github.com.helper`
pointing at `gh auth git-credential`, then clearing a cached credential
in the OS keychain (e.g. `git credential-osxkeychain erase`) has no
effect on GitHub pushes — `gh`'s own stored OAuth token is what
actually authenticates, and it can be missing a required scope (e.g.
`workflow`, needed to push changes under `.github/workflows/`) without
any indication other than GitHub's rejection message naming "an OAuth
App." Fix: `gh auth refresh -h github.com -s <missing-scope>` re-runs
`gh`'s own device-code auth flow to add the missing scope, rather than
regenerating a personal access token that `gh` wouldn't even be using.
```

- [ ] **Step 5: Manually verify**

Read all four files back once. Confirm every internal link
(`architecture.md`, `glossary.md`, `references.md`, `proposals/README.md`)
in `README.md` matches a real file path (note: `design-principles.md`
and `proposals/README.md` don't exist yet at this point in the plan —
that's expected; Task 12's final verification step confirms all links
resolve once every task is done).

- [ ] **Step 6: Commit**

```bash
git add docs/knowledge-base/README.md docs/knowledge-base/architecture.md docs/knowledge-base/glossary.md docs/knowledge-base/references.md
git commit -m "docs: add knowledge base core (architecture, glossary, references)"
```

---

## Task 7: Knowledge base design principles

**Files:**
- Create: `docs/knowledge-base/design-principles.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-09-05-home-feed-design-notes.md` (existing, read-only source material — do not modify it).
- Produces: the file `spont-product` (Task 5) and `CLAUDE.md`/proposal template (Tasks 9, 8) reference by path.

- [ ] **Step 1: Read the source material**

Read `docs/superpowers/specs/2026-09-05-home-feed-design-notes.md` in
full before writing this file — the content below extracts and
generalizes from it; accuracy against that source matters more than
prose style here.

- [ ] **Step 2: Create `docs/knowledge-base/design-principles.md`**

```markdown
# Design principles

The durable, reusable visual system and product-decision patterns for
Spont — extracted from the home-feed design work so they outlive that
one feature. This is the system; for the specific decisions made about
the home feed itself (and their history/reasoning), see
`docs/superpowers/specs/2026-09-05-home-feed-design-notes.md`. Check
here first for any new UI work; check the home-feed notes for how these
principles were applied to that specific feature.

## The core method: borrow cues, not formats

When drawing on a visual reference (a poster, a type specimen, another
app), pull the *vocabulary* — specific type choices, color rules, line
treatments — not the whole format. An early home-feed pass rendered
proposals as a literal technical document (spec-style label/value
tables) because it borrowed a type specimen's *format* wholesale; that
was rejected because a feed needs to read as a feed, not a form. What
carried over instead was the specimen's vocabulary: wide-tracked capital
letters, hairline rules, one accent color on a light ground, heavy
texture/grain. Apply this method to any future visual work: identify
what a reference is actually contributing (a color relationship? a type
pairing? a structural device?) and take only that.

## Typefaces

Two typefaces, each with one job: a geometric grotesque (currently
**Jost**, 400/500 weight) for everything non-numeric — headlines, nav,
labels, body copy — and a monospace (currently **Space Mono**) for
anything that's data: dates, durations, scores, captions.

The reasoning for *which* geometric grotesque matters more than the
specific pick: a rounded typeface can read as either *soft* (friendly,
casual — fat strokes, tight tracking, small closed counters) or
*technical* (precise, structural — even monoline strokes, open counters,
wide tracking). Spont's visual system wants the technical reading, not
the soft one — pick and set type accordingly if this ever needs to
change.

**Tracking (letter-spacing) carries real weight in this system** — it's
not a finishing touch, it's load-bearing. Roughly: very wide (0.4em+)
for a wordmark/logotype, wide (0.3em) for section/group labels, moderate
(0.18-0.2em) for interactive elements (nav, buttons, form labels), and
tighter (0.05-0.06em) for headline-scale text. Tight-set capitals
anywhere in this system read as a mistake, not a stylistic choice.

## Color

Three colors, each with exactly one job: an off-white/paper ground, one
accent color (currently red) for structure and action, and near-black
for reading text (ink, not "a color" — this system treats black
differently from the accent color, the way a printed poster does).

**The accent color means structure or action** — section dividers,
primary action buttons, an active/selected state — never decoration.
Body text should never be set in the accent color at small sizes (fails
contrast); ink carries all reading text. The accent color's one
non-structural use (in the home-feed feature) is to signal something
*costing* the user attention — e.g. a warning-adjacent value. If a
future feature wants to reuse the accent color for a similar "this
matters, look here" signal, that's consistent with the system; using it
decoratively is not.

## Line and surface treatment

No shadows, no rounded corners — hairline (thin, ~1.5px) rules and hard
edges do the work a shadow or radius would do elsewhere (separating
elements, implying a card boundary). A subtle grain/texture overlay
(very light over the whole page, heavier specifically over accent-color
fields) keeps flat digital color from looking too flat next to the
hairline rules — this was a deliberate fix, not an incidental style
choice, so don't drop it without replacing what it was solving.

## Product-decision patterns worth generalizing

A few decisions made for the home feed reflect a pattern worth applying
elsewhere, not just that one feature:

- **Prefer plain, human copy over formal/administrative language.**
  Buttons say things like "I'm in" / "Not this time," not "Approve" /
  "Deny." Apply this voice to any new user-facing copy.
- **Cut fields that don't have real backing data yet**, rather than
  including a placeholder. Duration and location were both explicitly
  cut from home-feed cards because neither exists in the data model —
  don't design UI around data that isn't real yet; add the field back
  once (and if) the data actually exists.
- **No filtering/configuration in a v1**, deliberately, when a simpler
  constraint (a one-per-day cap, in the home feed's case) already keeps
  the surface small enough not to need it. Revisit only once real usage
  shows people actually want to narrow something down — don't build
  configurability speculatively.
```

- [ ] **Step 3: Verify accuracy against the source**

Re-read `docs/superpowers/specs/2026-09-05-home-feed-design-notes.md`
once more and confirm every specific claim in the new file (typeface
names, color roles, tracking values, the cut-fields examples) matches
what that source document actually says — this file is only useful if
it's accurate, not just well-written.

- [ ] **Step 4: Commit**

```bash
git add docs/knowledge-base/design-principles.md
git commit -m "docs: extract durable design principles from home-feed design work"
```

---

## Task 8: Proposals intake

**Files:**
- Create: `docs/knowledge-base/proposals/README.md`
- Create: `docs/knowledge-base/proposals/TEMPLATE.md`

**Interfaces:**
- Consumes: `spont-onboarding`'s non-technical git-handling behavior (Task 1), `spont-product` agent (Task 5).
- Produces: the `proposals/` path referenced by `docs/knowledge-base/README.md` (Task 6) and `CONTRIBUTING.md` (Task 11).

- [ ] **Step 1: Create `docs/knowledge-base/proposals/README.md`**

```markdown
# Proposals

A place for anyone's product or design idea to become something real —
not just something said once in a conversation and forgotten.

## If you're a non-technical contributor

Just describe your idea to your Claude session. Once it knows you're a
non-technical contributor (it asks once, at the start, and remembers),
it will write the idea up here in plain language and save it for you —
you don't need to know how to create a file or use git. If you want a
quick sanity check on whether the idea conflicts with something already
decided, ask it to run the idea past the `spont-product` agent first.

## If you're a technical contributor

Check this directory for open proposals before starting a new feature.
Pick one up as input the next time you run the `superpowers:brainstorming`
skill — a proposal isn't a separate process from the normal
brainstorm → spec → plan → implement loop, it's an input to it, the same
way a one-line request from any contributor would be. Once a proposal is
picked up and turned into a real spec, you can delete the proposal file
(its content now lives in the spec) or leave it with a short note saying
which spec absorbed it.

## Writing a new proposal

Copy `TEMPLATE.md` to a new file in this directory (name it something
short and descriptive, e.g. `shorter-onboarding-flow.md`) and fill it in.
```

- [ ] **Step 2: Create `docs/knowledge-base/proposals/TEMPLATE.md`**

```markdown
# Proposal: <short title>

**What's the idea?**
(One or two sentences — plain language, no need for technical detail.)

**Why?**
(What problem does this solve, or what would get better?)

**What would change for someone using the app?**
(Describe it from the user's point of view — what would they see or do
differently?)

**Anything else?**
(Optional — sketches, examples, things you're unsure about.)
```

- [ ] **Step 3: Manually verify**

Read both files back and confirm the README's two paths (non-technical
vs. technical) each actually work: a non-technical contributor never
needs to open `TEMPLATE.md` directly (their Claude session does it for
them per `spont-onboarding`'s behavior), while a technical contributor
has enough instruction to do it themselves if they prefer.

- [ ] **Step 4: Commit**

```bash
git add docs/knowledge-base/proposals
git commit -m "docs: add proposals intake for cross-background contributor ideas"
```

---

## Task 9: `CLAUDE.md` restructure — role fork and codebase structure

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `docs/knowledge-base/README.md` (Task 6), `.claude/skills/*` (Tasks 1-3), `.claude/agents/*` (Tasks 4-5) — all referenced by path.
- Produces: nothing later tasks import; this is a leaf documentation update.

- [ ] **Step 1: Read the current file**

Read `CLAUDE.md` in full (it's short) before editing, so the new
sections are inserted in the right place relative to existing content
(the multi-user memory section from Phase 1 must stay intact).

- [ ] **Step 2: Replace the file's content**

Replace the entire contents of `CLAUDE.md` with:

```markdown
# Spont App

## New here? Start by picking a path

- **Non-technical / product contributor** — you have opinions on what
  Spont should do or look like, but don't need to touch code. Start at
  [`docs/knowledge-base/README.md`](docs/knowledge-base/README.md), and
  drop ideas in
  [`docs/knowledge-base/proposals/`](docs/knowledge-base/proposals/README.md).
  Just tell your Claude session what you're here to do — it'll ask your
  background once and remember it (see `spont-onboarding` below).
- **Technical contributor** — you're writing code, running the app, or
  reviewing a diff. Continue below for setup and structure.

See `README.md` for setup and `CONTRIBUTING.md` for the full contributor
workflow.

## Commands

```bash
npm run dev       # http://localhost:3000
npm test          # Vitest across packages/db and packages/core
npm run db:seed   # reset + reseed 5 fake users
```

(Or use the `spont-dev-server` / `spont-db-reset` skills, which do the
same thing with a safety check that plain commands don't — see Skills
and agents below.)

## Codebase structure

```
spont_app/
  apps/web/          # Next.js app — pages, API routes, login. The only
                      # piece that knows about HTTP/cookies/pages.
  packages/core/      # Business rules (Friends, Groups, CalendarProvider
                      # interface) — no knowledge of the web layer.
  packages/db/        # Prisma schema, client, seed data.
  docs/superpowers/   # Phase-by-phase specs and implementation plans —
                      # point-in-time, becomes history once a phase ships.
  docs/knowledge-base/ # Durable context — architecture, glossary, design
                      # principles, references, proposals. Doesn't expire.
  .claude/skills/     # Shared skills any contributor's session can use.
  .claude/agents/     # Shared subagents (code review, product review).
  .claude/memory/     # Per-contributor session memory (see below).
```

See `docs/knowledge-base/architecture.md` for *why* it's shaped this way.

## Skills and agents

Repo-committed, available to any contributor's session:

- **Skills** (`.claude/skills/`): `spont-onboarding` (detects contributor
  background — read this one first, it changes how the rest of a session
  should behave), `spont-dev-server`, `spont-db-reset`, `spont-status`.
- **Agents** (`.claude/agents/`): `spont-reviewer` (code review),
  `spont-product` (product/design review). Roster and rationale in
  `.claude/agents/README.md`.

## Multi-user contributor memory

This repo has multiple contributors, each with an isolated directory at
`.claude/memory/<github-username>/` (policy detail in `CONTRIBUTING.md`).
At the start of a session:

1. **Identify the contributor** — try `git config user.email`/`user.name`,
   or `gh api user --jq .login` if `gh` is authenticated. If still
   ambiguous, ask the user rather than guessing.
2. If `.claude/memory/<username>/` doesn't exist yet, copy it from
   `.claude/memory/TEMPLATE/`.
3. Read `.claude/memory/<username>/MEMORY.md` first — it's a short index.
   Only open individual `persistent/*.md` files the index points at.
4. Don't read or write another contributor's `.claude/memory/<other>/`
   directory unless explicitly asked to (e.g. reviewing a teammate's notes).

**Memory design:** `persistent/` is committed and PR-reviewed — decisions,
gotchas, anything worth surviving past the task that produced it.
`ephemeral/` is gitignored scratch space, discard freely. A contributor's
declared technical/non-technical role also lives in
`persistent/role.md` — see the `spont-onboarding` skill.

**Gotcha:** the repo-root `.gitignore`'s `.claude/` rule is anchored to
`/.claude/` (repo root only) *on purpose* — this is what lets
`spont_app/.claude/memory/*/persistent/` commit normally while
`ephemeral/` stays ignored via `spont_app/.gitignore`'s own rules. Widening
that root pattern back to a bare `.claude/` silently breaks the whole
contributor-memory convention (a bare `git add` on any persistent file
would start failing repo-wide).

Current phase: see `docs/superpowers/specs/` for the latest design and
`docs/superpowers/plans/` for the active implementation plan.
```

- [ ] **Step 3: Manually verify**

Read the new file back. Confirm every relative link (`docs/knowledge-base/README.md`,
`docs/knowledge-base/proposals/README.md`, `docs/knowledge-base/architecture.md`,
`.claude/agents/README.md`) resolves to a real file that exists by this
point in the plan (all should, since Tasks 1-8 run before this one).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: restructure CLAUDE.md with role fork and codebase structure"
```

---

## Task 10: `README.md` role fork

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `docs/knowledge-base/README.md` (Task 6).
- Produces: nothing later tasks import.

- [ ] **Step 1: Read the current file**

Read `README.md` in full before editing.

- [ ] **Step 2: Add the role fork after the title, before "Local setup"**

Insert this block immediately after the existing opening paragraph
("A scheduler that helps... design and `docs/superpowers/plans/` for
implementation plans.") and before the `## Local setup` heading:

```markdown
## New here? Start by picking a path

- **Non-technical / product contributor** — you don't need to do
  anything below. Start at
  [`docs/knowledge-base/README.md`](docs/knowledge-base/README.md)
  instead, and see `CLAUDE.md` for how your Claude session will get
  oriented to your background automatically.
- **Technical contributor** — continue below.
```

- [ ] **Step 3: Manually verify**

Read the full file back and confirm the insertion reads naturally (the
existing "Local setup" section should now clearly read as the
technical-contributor path) and the link resolves to a real file.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add contributor role fork to README"
```

---

## Task 11: `CONTRIBUTING.md` iteration loop

**Files:**
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consumes: `docs/knowledge-base/proposals/` (Task 8), `spont-product` agent (Task 5), `superpowers:brainstorming` skill (external, already available in this environment).
- Produces: nothing later tasks import.

- [ ] **Step 1: Read the current file**

Read `CONTRIBUTING.md` in full before editing — the existing "Workflow"
and "Claude session memory" sections must stay intact.

- [ ] **Step 2: Add a new section after "Workflow," before "Claude session memory"**

Insert this section between the existing `## Workflow` section and the
existing `## Claude session memory` section:

```markdown
## Iteration loop across contributor backgrounds

This repo has both technical and non-technical contributors. Here's how
an idea gets from "someone noticed something" to "actually built,"
regardless of who noticed it:

1. Anyone has an idea or notices something worth changing.
2. If you're non-technical: describe it to your Claude session. It'll
   write it up in `docs/knowledge-base/proposals/` for you and save it —
   see `docs/knowledge-base/proposals/README.md`. Optionally, ask for a
   quick sanity check against existing decisions first (the
   `spont-product` agent).
3. A technical contributor checks `docs/knowledge-base/proposals/` for
   open ideas before starting new feature work, and picks one up as
   input the next time they run the `superpowers:brainstorming` skill —
   a proposal is an input to the normal design process, not a separate
   one.
4. The resulting spec/plan/implementation goes through the usual review
   (`spont-reviewer` for code, `spont-product` again for anything
   product/UI-facing before it ships).
5. Anything durable that comes out of the cycle — a new term, a new
   design rule, an architecture decision — goes into
   `docs/knowledge-base/`, not left buried in a phase-dated spec where
   it'll be hard to find later.
```

- [ ] **Step 3: Manually verify**

Read the full file back and confirm the new section sits correctly
between the two existing ones, and that both existing sections are
unmodified.

- [ ] **Step 4: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: document cross-background iteration loop in CONTRIBUTING"
```

---

## Task 12: End-to-end verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything built in Tasks 1-11.
- Produces: nothing — this is the final sign-off that the contributor tooling works end to end.

- [ ] **Step 1: Verify every cross-reference resolves**

From `spont_app/`, check every relative link mentioned across
`CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, and every file under
`docs/knowledge-base/` actually points at a file that exists:

```bash
ls docs/knowledge-base/README.md docs/knowledge-base/architecture.md \
   docs/knowledge-base/glossary.md docs/knowledge-base/design-principles.md \
   docs/knowledge-base/references.md docs/knowledge-base/proposals/README.md \
   docs/knowledge-base/proposals/TEMPLATE.md .claude/agents/README.md \
   .claude/agents/spont-reviewer.md .claude/agents/spont-product.md \
   .claude/skills/spont-onboarding/SKILL.md .claude/skills/spont-dev-server/SKILL.md \
   .claude/skills/spont-db-reset/SKILL.md .claude/skills/spont-status/SKILL.md
```

Expected: every path listed exists (no "No such file" errors).

- [ ] **Step 2: Walk through `spont-onboarding`'s logic once for real**

Confirm `.claude/memory/<your-username>/persistent/role.md` doesn't
already exist (if it does from a prior manual test, that's fine — note
the existing value and skip to confirming the "already recorded" branch
instead). Simulate the skill's Step 2/3 logic: since this session's own
contributor role hasn't been recorded yet in this codebase, this is a
good real test — follow the skill's own instructions, ask (yourself, as
the contributor driving this session) the plain-language question, and
record the answer at `.claude/memory/<your-username>/persistent/role.md`.
Confirm the file now exists with exactly one lowercase word
(`technical` or `non-technical`) and no trailing punctuation.

- [ ] **Step 3: Manually verify `spont-dev-server` and `spont-db-reset`**

Actually invoke each skill's instructions once: start the dev server
backgrounded per `spont-dev-server`'s Step "Starting the server," confirm
`curl -sI http://localhost:3000` responds, then stop it per its
"Stopping the server" section and confirm with both `lsof` and `ps`
commands that it's actually gone (per the skill's own instruction not to
just claim it). Then run `spont-db-reset`'s commands and confirm
`npm test --workspace packages/db` passes afterward.

- [ ] **Step 4: Manually verify `spont-status`**

Actually gather the information the skill describes (`ls` both
`docs/superpowers/plans/` and `docs/superpowers/specs/`, `git log
--oneline -20`) and write one real plain-language paragraph following
its instructions, to confirm the approach produces genuinely accurate,
jargon-free output against this repo's real current state.

- [ ] **Step 5: Dispatch `spont-reviewer` once against a real diff**

Pick any real, already-existing diff in this repo's history (e.g. a
Phase 1 commit touching `packages/core`) and dispatch the agent against
it. Confirm its output references the actual `AppError`/`toErrorResponse`
pattern or `CalendarProvider` seam by name if the diff touches either —
not generic, could-apply-to-any-repo advice.

- [ ] **Step 6: Dispatch `spont-product` once against the existing home-feed
design work**

Dispatch the agent to review whether the "photo-forward cards" decision
(in the home-feed design notes) is consistent with the rest of the
visual system now documented in `docs/knowledge-base/design-principles.md`.
Confirm its output correctly quotes/references actual documented
decisions, not generic design advice.

- [ ] **Step 7: Fix anything found**

If Steps 1-6 surface any broken link, inaccurate claim, or agent output
that reveals a priming gap, fix it now and note the fix in the commit
message.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: end-to-end verification of contributor tooling (skills, agents, knowledge base)"
```

(If Step 7 found nothing to fix, this commit may be empty of file
changes beyond Step 2's `role.md` — that's fine; skip this final commit
if `git status` shows nothing beyond what's already committed in earlier
tasks.)
