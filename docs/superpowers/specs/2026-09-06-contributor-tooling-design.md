# Contributor Tooling — Skills, Agents, Knowledge Base Design

Status: Approved for implementation planning
Date: 2026-09-06

## Context

Phase 1 (Foundation) established the app's code and a per-contributor
memory convention (`.claude/memory/<username>/`). What's missing is
shared tooling and context that works the same way for every kind of
contributor — not just the person driving a terminal.

The repo now has two contributors of meaningfully different shape:
technical (writes code, runs the dev stack, reviews diffs) and
non-technical (has product/design opinions, wants to give feedback,
doesn't touch `npm`/`git`). Both need to be able to open a fresh Claude
Code or Claude Desktop session against this repo and immediately know
where they are and what to do — without the maintainer explaining it
every time.

This phase builds:
1. Shared, repo-committed **skills** (`.claude/skills/`) and **agents**
   (`.claude/agents/`) — tooling every contributor's Claude session can
   invoke, not just personal/local configuration.
2. A **knowledge base** (`docs/knowledge-base/`) — durable, topic-organized
   context distinct from `docs/superpowers/` (which holds phase-by-phase
   specs and plans, and stays that way).
3. A **role-aware entry point** in `CLAUDE.md` and `README.md` so the
   fork — "which kind of contributor am I, where do I start" — is the
   first thing anyone sees, regardless of which Claude surface they're
   using.
4. A lightweight **proposal intake** so a non-technical contributor's
   product/design ideas have a real, documented path into the existing
   brainstorm → spec → plan → implement loop, instead of living only in
   a conversation that evaporates.

## Non-goals

- Not building `spont-analyst` (a data-analysis agent) yet — there is no
  scheduling/engagement data in the app yet (that's Phase 3+). It gets a
  documented reserved slot, not code.
- Not changing anything about the actual Spont application (routes,
  schema, UI). This phase is entirely contributor-facing tooling and docs.
- Not building a wiki, external tool, or anything outside this git repo —
  everything here is plain files, versioned and reviewed like code.

## Architecture

```
spont_app/
  .claude/
    skills/
      spont-onboarding/SKILL.md
      spont-dev-server/SKILL.md
      spont-db-reset/SKILL.md
      spont-status/SKILL.md
    agents/
      README.md                 # roster + reserved slots
      spont-reviewer.md
      spont-product.md
    memory/                     # unchanged, from Phase 1
  docs/
    superpowers/                # unchanged: phase specs/plans (transient-ish)
    knowledge-base/             # new: durable, topic-organized context
      README.md
      architecture.md
      glossary.md
      design-principles.md
      references.md
      proposals/
        README.md
        TEMPLATE.md
  CLAUDE.md                     # restructured: role fork + codebase structure
  README.md                     # role fork nod + pointers
  CONTRIBUTING.md               # iteration-loop section + pointers
```

### Why `docs/knowledge-base/` is separate from `docs/superpowers/`

`docs/superpowers/specs/` and `plans/` are phase-scoped and point-in-time
— a spec describes what Phase 3 will build, then Phase 3 gets built and
the spec becomes history. The knowledge base is the opposite: durable
answers that don't expire when a phase ships (why the monorepo is shaped
this way, what "flake score" means, which typefaces the design system
uses). Mixing the two would mean durable content getting buried under a
growing pile of phase-dated files, or phase specs getting mistaken for
still-open design questions after the phase ships.

## Skills (`.claude/skills/`)

Each is a real, immediately useful fix for something that already caused
friction in this repo, not speculative tooling.

- **`spont-onboarding`** — an interactive, auto-triggering skill that
  determines contributor background and adjusts git-workflow verbosity
  for the rest of the session. Modeled directly on how
  `superpowers:using-superpowers` triggers itself at the start of any
  conversation (its description says "use when starting any conversation");
  this skill's description does the same, scoped to this repo, so a
  session doesn't need the contributor to know it exists or invoke it by
  name.

  Behavior:
  1. Check the contributor's `.claude/memory/<username>/persistent/`
     directory for a previously recorded role. If found, apply it
     silently — don't re-ask every session.
  2. If not found, ask one plain question early in the session: "Quick
     one before we start — are you writing code in this repo, or working
     on product/design/ideas without touching code?" Two answers, no
     jargon, no follow-up questions about tooling or experience level.
  3. Record the answer in `.claude/memory/<username>/persistent/role.md`
     (one line) so it's never asked again for that contributor.
  4. Apply it for the rest of the session:
     - **Technical**: no behavior change — normal git detail, normal
       command visibility, assume fluency.
     - **Non-technical**: git mechanics (staging, committing, and — if
       the contributor asks to "save" or "share" something like a
       proposal — committing it) are performed directly, without walking
       through commands, flags, or diffs unless specifically asked. A
       one-line confirmation is enough ("Saved your idea to the repo —
       the team will see it next time someone picks up new proposals.").
       Never hand a non-technical contributor a git command to run
       themselves as the primary path; do it for them and confirm.

- **`spont-dev-server`** — starts the Next.js dev server correctly
  (backgrounded, confirms it's up via a health check, tells the invoker
  how to stop it). Directly codifies the lesson from Phase 1: three
  separate implementer sessions stalled or left orphaned processes by
  running `npm run dev` in the foreground. This skill makes "start the
  dev server" foolproof for any future session, technical or not.
- **`spont-db-reset`** — wraps `docker compose up -d` (or the local-Postgres
  equivalent), `npm run db:migrate`, `npm run db:seed` into one step, so
  "give me a clean database" doesn't require remembering three commands
  in the right order.
- **`spont-status`** — summarizes the current state of the app in plain
  language: which phase is active, what's built vs. planned, recent
  activity (derived from `git log` and `docs/superpowers/plans/`). No
  jargon, no code shown — this is the one a non-technical contributor
  reaches for first to get oriented, and it's also just useful for a
  technical contributor re-entering the repo after time away.

Each skill is a `SKILL.md` with the same frontmatter shape already used
by every skill in this environment (`name`, `description`) plus body
instructions — consistent with how `superpowers:*` skills are authored,
so nothing about their format needs to be learned twice.

## Agents (`.claude/agents/`)

- **`spont-reviewer`** (built now) — a code-review subagent primed on
  this repo's actual conventions: `AppError`/`toErrorResponse` mapping,
  the `CalendarProvider` seam (mock now, real Google Calendar later,
  nothing upstream should depend on which), the `packages/core` vs.
  `apps/web` boundary. For technical contributors reviewing or writing
  code.
- **`spont-product`** (built now) — a product/design-review subagent
  primed on the knowledge base's `design-principles.md` and the existing
  home-feed design notes. Takes a proposed idea or mockup and checks it
  against what's already decided (visual system, copy voice, product
  decisions like "accept is instant & independent") rather than
  re-litigating settled questions. For non-technical contributors (or
  anyone) sanity-checking a product/design idea without needing to read
  code.
- **`spont-analyst`** (reserved, not built) — documented in
  `agents/README.md` as a future slot for data/engagement analysis, to be
  built once Phase 3+ produces real scheduling/flake-score data to
  analyze. Listed now so the roster's shape is visible, without
  pretending an agent can meaningfully act on data that doesn't exist.

Each built agent is a `.md` file under `.claude/agents/`, following this
environment's existing project-subagent convention (frontmatter
including `name`, `description`, and tool/model scoping as needed).

## Knowledge base (`docs/knowledge-base/`)

- **`architecture.md`** — why the monorepo is shaped this way (`apps/web`,
  `packages/core`, `packages/db`), the `CalendarProvider` seam and why it
  exists, why real Google Calendar auth is deliberately deferred. Answers
  "why does this work this way," written for a reader who may not know
  Next.js or Prisma — technical terms get one-line plain-language glosses
  inline, not assumed.
- **`glossary.md`** — Spont-specific terms, defined in plain language
  first and technical detail second: flake score, universal label,
  free/busy, mock calendar provider, etc. Grows as later phases introduce
  new concepts (label taxonomy, scheduling signals).
- **`design-principles.md`** — the durable, reusable rules extracted from
  the home-feed design work: the two-typeface system (Jost/Space Mono)
  and why each was chosen, the white/red/ink palette and its rule ("red
  means structure or action"), hairline-rules-not-shadows, the tracking
  values, and the general principle of "borrow cues, not formats" from
  visual references. This is the system, not a duplicate of the
  feature-specific home-feed notes (which stay in `docs/superpowers/specs/`
  as design history for that one feature) — future UI work of any kind
  checks here first.
- **`references.md`** — external dependency notes and gotchas hit during
  the build (Prisma/Next.js version-specific issues, the ESM/CommonJS
  `next.config.js` conflict from Phase 1, etc.) — a place to look
  something up instead of rediscovering it.
- **`proposals/`** — the intake mechanism for non-technical (or anyone's)
  ideas. `TEMPLATE.md` is a short, jargon-free form (what's the idea, why,
  what would change for a user) that anyone can copy and fill in without
  needing to write a spec. `README.md` explains: drop a proposal here in
  plain language; optionally get it sanity-checked against
  `design-principles.md` via the `spont-product` agent; a technical
  contributor picks it up as input the next time they run the
  `brainstorming` skill for a new feature. This is the actual mechanism
  that makes the contributor loop iterative across backgrounds — an idea
  from a non-technical contributor has a real, versioned path into what
  gets built, instead of living only in a chat that no one else sees.
  For a non-technical contributor, saving a proposal is conversational —
  they describe the idea, and (per `spont-onboarding`'s role handling)
  the session writes the file and commits it on their behalf, confirming
  in one line. They never need to know `git add`/`git commit` exist.

## Role-aware entry point

Both `CLAUDE.md` and `README.md` get the same short fork placed
immediately after their title — before setup steps, before anything else
— so it's the first thing any session (Code or Desktop) or any human
opening the file sees:

```markdown
## New here? Start by picking a path

- **Non-technical / product contributor** — you have opinions on what
  Spont should do or look like, but don't need to touch code. Start at
  [`docs/knowledge-base/README.md`](docs/knowledge-base/README.md), and
  drop ideas in `docs/knowledge-base/proposals/`.
- **Technical contributor** — you're writing code, running the app, or
  reviewing a diff. Continue below for setup, then see
  [Codebase structure](#codebase-structure).
```

`CLAUDE.md` additionally gets a **Codebase structure** section: a
concise annotated tree (one line per top-level piece — `apps/web`,
`packages/core`, `packages/db`, `docs/superpowers/` vs.
`docs/knowledge-base/`, `.claude/`) so a technical session is oriented
immediately instead of inferring structure by exploring.

## Iteration loop (documented in `CONTRIBUTING.md`)

A new short section describing the cross-background loop this phase
enables:

1. Anyone (any background) notices something or has an idea.
2. Non-technical: write it as a proposal in
   `docs/knowledge-base/proposals/` using `TEMPLATE.md`. Optionally run it
   past the `spont-product` agent first for a sanity check against
   existing design decisions.
3. A technical contributor picks up open proposals as input the next
   time they run the `superpowers:brainstorming` skill for a new feature
   — proposals aren't a separate process, they're an input to the
   existing one.
4. The resulting spec/plan/implementation is reviewed as usual
   (`spont-reviewer` for code, `spont-product` for anything UI/product
   again before it ships).
5. Anything durable that comes out of the cycle (a new term, a new design
   rule, an architecture decision) gets added to the knowledge base, not
   left buried in a phase-dated spec.

## Testing

This phase is entirely documentation and Claude tooling config — no
application code changes, so no Vitest coverage applies. "Testing" here
means: each skill is invoked once manually to confirm it behaves as
documented (dev server actually starts/stops cleanly, db-reset actually
resets and reseeds, status actually reflects real repo state); each
agent is dispatched once against a real, small example (reviewer against
an existing small diff, product against the existing home-feed notes) to
confirm its priming produces sensible, on-topic output; the role-fork
and codebase-structure sections are read back for accuracy after
writing.

## Out of scope for this phase

Building `spont-analyst`, changing any application code, any UI/UX
implementation (the home-feed design stays mockup-stage, unaffected by
this phase), any tooling outside plain git-tracked files.
