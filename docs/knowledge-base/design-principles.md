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

**Known unresolved exception:** the already-built "Photo-forward cards"
feature (see
`docs/superpowers/specs/2026-09-05-home-feed-design-notes.md`'s
"Photo-forward cards" section) uses a rounded photo band and pill-shaped
date/avatar chips, and sets its headline in a serif face — both in
tension with the no-rounded-corners rule above and the two-typeface rule
below. This was flagged by a `spont-product` review (2026-09-06) and has
not yet been resolved either way (deliberate scoped exception vs.
mockup revision) — check the home-feed notes' "Open threads" section
before treating either this document or that mockup as settled on this
specific point.

## Product-decision patterns worth generalizing

A few decisions made for the home feed reflect a pattern worth applying
elsewhere, not just that one feature:

- **Prefer plain, human copy over formal/administrative language.**
  Buttons say things like "I'm in" / "Not this time," not "Approve" /
  "Deny." Apply this voice to any new user-facing copy.
- **Cut fields that don't have real backing data yet**, rather than
  including a placeholder. Location (and category/activity type) were
  explicitly cut from home-feed cards because neither exists in the data
  model — don't design UI around data that isn't real yet; add the field
  back once (and if) the data actually exists. (Duration was cut too,
  but for an unrelated reason: it's derivable from the time range
  already shown, and it was competing with the date/time for the same
  attention — not a data-availability problem.)
- **No filtering/configuration in a v1**, deliberately, when a simpler
  constraint (a one-per-day cap, in the home feed's case) already keeps
  the surface small enough not to need it. Revisit only once real usage
  shows people actually want to narrow something down — don't build
  configurability speculatively.
