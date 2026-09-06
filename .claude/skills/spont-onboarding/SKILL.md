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
