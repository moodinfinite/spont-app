---
name: spont-pr-retro
description: Use after creating a PR or before merging a feature branch — extracts project knowledge and process learnings from the branch into the durable knowledge base, so future sessions start smarter instead of from scratch.
---

# PR Retro

Run this at PR time. It reads the branch diff, spec, plan, and any SDD
ledger, then proposes concrete additions to the knowledge base and
process docs. The contributor reviews every proposed change before it's
committed.

## When to run

- After creating a PR (before merge review)
- Or just before merging, if the PR was created without running this

## Inputs

Gather these automatically — don't ask the contributor to find them:

1. **Branch diff**: `git diff $(git merge-base main HEAD)...HEAD --stat`
   and `git log --oneline $(git merge-base main HEAD)..HEAD`
2. **Spec**: check `docs/superpowers/specs/` for a spec dated to this
   branch's work
3. **Plan**: check `docs/superpowers/plans/` for a matching plan
4. **SDD ledger**: check `.superpowers/sdd/*/progress.md` for deferred
   minors, rulings, and parked findings (may already be cleaned up —
   that's fine, skip if absent)
5. **Existing knowledge base**: read all files in `docs/knowledge-base/`
   to avoid duplicating what's already there

## Step 1: Knowledge extraction

Scan the branch for durable knowledge. For each item found, classify it
and propose where it goes:

| What to look for | Target file |
|---|---|
| New terms or concepts introduced | `docs/knowledge-base/glossary.md` |
| Architecture decisions (why something is shaped the way it is) | `docs/knowledge-base/architecture.md` |
| Gotchas discovered (library quirks, config traps, environment issues) | `docs/knowledge-base/references.md` |
| New code patterns established (conventions future tasks should follow) | `docs/knowledge-base/patterns.md` |

Rules:
- **Don't duplicate the spec.** Specs are point-in-time history. The
  knowledge base is durable context that outlives the phase that
  produced it.
- **Be specific.** "The privacy filter is important" is not a learning.
  "The privacy filter is a pure function in core that takes events,
  mappings, and visibility — the web layer never applies its own
  filtering" is.
- **Create files that don't exist yet.** If `glossary.md` or
  `patterns.md` doesn't exist, create it with a one-line header and
  the new content.
- **Append, don't rewrite.** Existing content in these files stays.
  Add new sections or bullet points.

## Step 2: Process feedback

Scan for things that would improve future development work:

| What to look for | Where it goes |
|---|---|
| Plan defects found during execution (wrong user names, missing steps, incorrect assumptions) | `docs/knowledge-base/process-learnings.md` |
| Deferred minors that reveal a pattern (e.g., same issue in 3+ tasks) | Propose a rule for `CLAUDE.md` or `CONTRIBUTING.md` |
| Skill gaps (a skill was missing, or an existing skill was awkward) | `docs/knowledge-base/process-learnings.md` |
| Testing patterns that worked well or poorly | `docs/knowledge-base/process-learnings.md` |
| Things that slowed down the session (environment issues, missing context) | `docs/knowledge-base/references.md` (if technical) or `process-learnings.md` (if procedural) |

Rules:
- **Be actionable.** "The plan could be better" is not a learning.
  "Plans should include DATABASE_URL setup as a prerequisite step when
  tasks touch the database" is.
- **Propose CLAUDE.md changes as diffs.** If a deferred minor reveals a
  standing rule (e.g., "always use encodeURIComponent on URL path
  params"), show the exact line to add to CLAUDE.md.

## Step 3: Contributor memory

Update the current contributor's `.claude/memory/<username>/`:

- Add a one-line entry to `MEMORY.md` linking to a new persistent file
  for this phase/feature
- Create the persistent file with personal context: what they built,
  decisions they made, gotchas they hit

## Step 4: Present and confirm

Show the contributor everything you propose to add, organized by file.
Format:

```
## Proposed knowledge base updates

### docs/knowledge-base/architecture.md
+ [new content to append]

### docs/knowledge-base/patterns.md (new file)
+ [full content]

### CLAUDE.md
+ [line to add under which section]

### .claude/memory/<username>/persistent/<feature>.md (new file)
+ [full content]
```

Wait for explicit approval. The contributor may:
- Approve all
- Approve some, reject others
- Edit the proposed content
- Say "nothing to add" (that's fine — not every PR has learnings)

## Step 5: Commit

After approval, commit only the approved changes:

```bash
git add docs/knowledge-base/ CLAUDE.md CONTRIBUTING.md .claude/memory/
git commit -m "docs: PR retro — update knowledge base and process docs"
```

Push to the branch so it's included in the PR.

## What this skill does NOT do

- Auto-commit without review — every proposed change is shown first
- Touch other contributors' memory directories
- Rewrite existing knowledge base content (append only)
- Run on every commit — only at PR time
- Replace specs — specs are history, the knowledge base is living context
