# Spont knowledge base

Durable, topic-organized context about this project — answers that stay
true across phases, unlike `docs/superpowers/specs/` and `plans/`, which
describe one phase's work and become historical once that phase ships.

**If you're a non-technical contributor, start here.** You don't need to
read any code to use this repo. This knowledge base plus the
`spont-product` agent are the tools you need to understand what Spont is
and contribute product/design ideas.

## What's here

- [`../HANDOFF.md`](../HANDOFF.md) — current app status, preserved branches,
  implementation gaps, and first tasks for a new collaborator.
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
at the right next step. This automatic saving works in Claude Code,
which can write files and commit on your behalf — in Claude Desktop,
describe your idea and ask for it written up in the
`proposals/TEMPLATE.md` format, then pass it to a technical contributor
to save.
