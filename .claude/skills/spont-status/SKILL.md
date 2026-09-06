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
