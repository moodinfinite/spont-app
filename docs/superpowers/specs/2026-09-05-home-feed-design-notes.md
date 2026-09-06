# Home Feed — Design Notes (in progress)

Status: **Design in progress, not yet approved as a spec.** This is a
design target for future phases — it exists only as a mockup, no
application code is built against it, and none of it blocks Phase 1
(foundation), which is being built separately/in parallel. Treat this as input for whoever writes the Phase 3 (scheduling
engine) and Phase 4 (accept/decline + write-back) specs later, per
`docs/superpowers/specs/2026-09-05-spont-app-foundation-design.md`.

## ✅ Resume point (updated 2026-09-05)

**Photo-forward cards are now built and published.** The two-state card
described under "Planned card structure" below exists in
`docs/superpowers/mockups/2026-09-05-home-feed-mockup.html`: Bob's 1:1
card and the Trivia Crew group card use the photo state; the other three
stay in the default layout. The signature quarter-circle notch (tinted
coral for friend-initiated, slate-blue for system-suggested) is applied
to **every** card, photo or not.

Cover art in the mockup is inline SVG scenery, not real photographs —
placeholder standing in for a user-attached or auto-suggested photo. It
keeps the mockup self-contained (no external image loads) and shows the
layout without implying a specific photo source.

Live mockup (republished 2026-09-05):
https://claude.ai/code/artifact/25bc9f84-48a4-4c96-a5e9-6ea4ebd80e29
Local copy: `docs/superpowers/mockups/2026-09-05-home-feed-mockup.html`

Note: the previously listed artifact URL (045f709f-…) no longer resolves
and has been replaced by the one above.

**Since then (2026-09-06):** the visual system has been through two more
passes — a wine-red poster direction, then the current white + red
specimen-cue direction, which is where it stands. See "Visual system"
below. A friends-only flake score was added to every proposal. Copy voice
is unchanged: buttons still say "I'm in" / "Not this time," not
"Approve"/"Deny."

**Next open design questions:** (1) edge and empty states — with a
one-proposal-per-day cap, an empty or near-empty feed is a state people
hit constantly, and nothing covers it; (2) the two flake-score visibility
questions listed under "Flake score" below.

## Why this exists

The home page is where Spont's actual value shows up — a feed of proposed
hangouts you approve or decline. That depends on the scheduling engine
(Phase 3) and accept/decline + calendar write-back (Phase 4), neither of
which exist yet. This doc designs the target UI ahead of time so Phase 3/4
specs have a concrete shape to build toward.

## Product decisions

- **Proposal origin — both, visibly distinguished.** Friend-initiated
  ("Bob wants to hang out") and system-suggested ("You and Carol are both
  free") cards coexist in the same feed but look different (solid accent
  border vs. dashed cool-blue border, different headline phrasing).
- **Accept rule — instant & independent.** Approving writes to your
  calendar immediately. No threshold, no waiting on the rest of a group.
  Matches the foundation spec's Phase 4 wording exactly.
- **Time horizon — one month, capped at one proposal per day.** Caps the
  feed at roughly 30 cards max, realistically far fewer. Grouped by month
  via a marker in the left gutter (see "Month marker" below).
- **Filtering — none in v1.** YAGNI; revisit once real usage shows what
  people actually want to narrow down.
- **Card contents** — who, when, a flake score, and (system cards only) a
  short reason line ("You haven't hung out in 19 days"). **Duration was
  cut 2026-09-06** — it is derivable from the time range shown, and it
  was competing with the date/time for the same attention. Explicitly
  **no** category/activity type and **no** location — neither exists in
  the current data model and both were cut in brainstorming.
- **Post-decision state** — approving moves the card out of the pending
  feed and into a persistent "Upcoming" section lower on the page (not a
  vanish-and-forget). Declining just removes the card, no residue.
- **Calendar disclosure** — a popup (not a persistent banner) explains
  that suggestions come from Google Calendar free/busy status only, never
  event details, and that accepting is instant/independent. Auto-shows
  once per page load, dismissible (click outside, X, or Escape). No
  persistent way to reopen it — once dismissed, it's gone.

## Navigation

**Moved to a bottom dock (2026-09-06).** Home / Friends / Groups now sit
in a fixed dock at the bottom of the viewport, alongside a red **New**
action and a **You** item that absorbs the old profile-avatar dropdown
(Settings, Log out). The top bar is reduced to the wordmark and the
notifications bell.

The dock is **squared off, not the pill-and-circles** of the reference
that prompted it. Rounded shapes are the one thing this visual system
doesn't do — a soft dock would have been the only radius on the page.
Same placement and behaviour, hard edges.

Reason for the move is unchanged from the original nav trim: keep
top-level navigation off the feed so the proposals and their
approve/deny buttons stay the visual focus.

## Visual hierarchy

First pass had too much competing information (avatar, date badge,
duration pill, a type-identity chip, reason line, buttons all fighting
for attention). Fixes applied:
- Removed the separate "Invite"/"Suggested" type chip — the border style
  (solid vs. dashed) plus the headline wording already carry that
  distinction.
- Enlarged and emphasized the **I'm in / Not this time** buttons
  (full-width, bold, colored) so they're unambiguously the primary
  action on every card.
- Quieted secondary metadata (smaller avatar/date badge, muted duration
  pill and reason line) so it reads as context, not competition.
- Month divider made deliberately prominent — **sticky while scrolling +
  a solid color band** — but banded in a neutral dark/ink tone rather
  than the coral or slate-blue accent, specifically so it doesn't steal
  visual weight from the buttons. Structural prominence, not competing
  hue.

## Visual system (revised 2026-09-06 — white + red, specimen cues)

Third and current direction. Replaced the wine-red poster system, which
in turn replaced the original cool-grey + coral one. Driven by two
references: a BIRDIE typeface specimen (red field, black wide-tracked
monoline caps, hairline rules, label/value pairs) and an ATL CREW riso
poster (off-white paper, one red ink, heavy press grain).

**Cues borrowed, not the format.** An earlier pass rendered the feed as a
literal technical document — spec tables with `WHO / TIME / LENGTH`
label-value rows. That was rejected: it reads as a form, not a feed. The
feed is a feed. What carries over is the *vocabulary* — wide-tracked
caps, hairline rules, one red on white, press grain, hard edges.

- **Typefaces — two.** **Jost** (a geometric monoline grotesque, the
  closest widely-available match to the BIRDIE specimen) for everything
  non-numeric, at 400/500. **Space Mono** for data — dates, durations,
  scores, captions. Fredoka, Fraunces and Public Sans are all cut.
- **Why Jost and not the previous Fredoka.** Both are "round," which is
  why the distinction matters: Fredoka is round because it is *soft* —
  fat strokes, tiny closed counters, tight tracking — and reads as
  friendly. Jost is round because its *skeleton* is geometric — even
  monoline strokes, open counters, set at 0.18em+ tracking — and reads
  as technical. The friendliness was never the roundness; it was the fat
  terminals and the tight fit.
- **Tracking is the load-bearing rule.** 0.42em for the wordmark, 0.30em
  for month bands, 0.18–0.20em for labels/nav/buttons, 0.055em for
  headlines. Tight caps in this system look like a mistake.
- **Color — white, red, black.** Paper `#FFFFFF` on an off-white ground
  `#F4F2EF`, ink `#111111`, red `#E12E1C`. Both references use black as
  ink rather than as a color, and red as the only hue; red-on-white body
  text would fail contrast at small sizes, so ink carries the reading.
- **Red means structure or action** — month bands, figure plates, the
  primary button, the active nav underline. Its one other use is a poor
  flake score, which is deliberate: a low score should feel like it costs
  something.
- **Hairline rules do the work shadows used to.** No shadows, no radii.
  Cards are 1.5px black rectangles on off-white.
- **Press grain** at 3.5% over the page and 16% multiply over every red
  field. Flat digital red looked wrong next to the hairlines.

### Month marker

Month grouping went through three treatments. A quiet mono label was too
easy to miss; a full-bleed red band read as too heavy and spent the hue
on something structural. It now lives as a **sticky marker in a left
gutter** beside the feed — month abbreviation in tracked caps with an
open-proposal count beneath — so it never interrupts the reading column.

The vertical rule belongs to the feed column, not the marker, so it runs
the full height of the month rather than stopping where the sticky
element does. Under 640px the gutter collapses to a sticky ruled strip
above each month.

### Date and time

The date/time line is the loudest thing on a card after the headline:
mono at 18px, the date in red, the time in ink, separated by a slash.
This is deliberate — the whole decision is "am I free then," so the when
should not be metadata-sized.

### Flake score

New in this pass. Shows **how reliably each friend actually keeps a
hangout they accepted** — friends' scores only; there is no self-score on
the home feed.

- A ten-segment tick meter, the number in mono, and a plain-language
  verdict ("Rarely bails" / "Usually shows" / "Often thins out" /
  "Bails often"), ruled off between the headline and the buttons.
- Group proposals show an aggregate plus a per-person breakdown line
  (`Bob 92 · Carol 78 · Erin 45`), so a single unreliable member is
  visible rather than averaged away.
- Scores under 70 turn red — meter, number and verdict together.
- The disclosure popup now states where scores come from and that only
  you see them.

**Product risk, flagged deliberately:** this turns the feed into a
ranking of your friends, and it was chosen over a self-only score with
that tradeoff understood. Two things are undecided and should be settled
before Phase 3/4 specs: whether a person can see their own score, and
whether anyone can see that you can see theirs. Both are visible in the
current design as "only you see them," which is a claim the backend would
have to actually honor.

## Photo-forward cards

Prompted by two reference images the user liked:
1. An event-discovery app where the photo *is* the card, with floating
   pill-shaped overlays (avatar stack, date, price) on top of the image,
   and a floating dark bottom nav with a raised gradient CTA.
2. An Italian festival poster/card: color-blocked panels, oversized
   condensed display type, small-caps label/value metadata pairs, a
   sticker-style tag breaking the card edge, and a repeating black
   semicircle shape as a signature brand device.

Decisions made on how much to pull in:
- **Photo scope**: a purely decorative/optional cover photo on individual
  proposal cards (e.g. auto-suggested from a past photo of you and that
  friend, or manually attached) — not a "memories" feature for past
  hangouts, which would be a separate, later, out-of-scope idea.
- **Direction**: blend, not wholesale adoption. Cards become
  photo-forward where a photo exists; the surrounding nav/chrome stays
  the calm, quiet version already built (no floating dark nav, no
  gradient CTA button).
- **Palette/type**: unchanged. Only specific *devices* get borrowed —
  floating pill chips (date/avatar) on top of a photo, and a small
  recurring signature shape mark (a quarter-circle notch, tinted per card
  type) in one consistent corner of every card, photo or not.

Card structure (built into the mockup file):
- **No photo (default/fallback)**: unchanged from the current mockup —
  date badge, avatar, headline, time, reason, full-width buttons.
- **With a cover photo**: photo fills the top ~55% of the card as a
  rounded image band. Date badge and avatar become translucent pill
  chips floating on the photo's corner. Headline sits directly over the
  photo (large serif, white text, gradient scrim for legibility). Below
  the photo, a plain white footer strip holds the reason line (if any)
  and the **same size/prominence** approve/deny buttons as every other
  card — the photo must never outrank the decision.
- Two of the five sample cards (Bob's 1:1, and the Trivia Crew group
  card) were chosen to demonstrate the photo state; the other three stay
  in the default layout, so both states are visible at once.

**Implemented and published** — see the resume point at the top for the
current artifact URL.

## Open threads for whoever picks this up next

- **Photo-forward cards use rounded corners and a serif headline, which
  conflict with the visual system documented in
  `docs/knowledge-base/design-principles.md`** (no-shadows/no-rounded-
  corners rule, and the two-typeface — Jost/Space Mono, no serif — rule).
  Flagged by a `spont-product` review (2026-09-06); not yet resolved.
  This needs an explicit decision, not a silent fix in either direction:
  either treat the rounded photo band/pill chips and serif headline as a
  deliberate, scoped exception (and add it to design-principles.md the
  way the flake score's accent-color use is already a documented
  exception), or revise the mockup to match the standing rules (hard-
  edged photo crop, hairline-bordered date/avatar treatments instead of
  pills, headline set in Jost or Space Mono).
- The friend-decline-vanishes vs. group-decline-persists asymmetry
  (noted in the foundation plan) will eventually surface here too —
  worth deciding if declined proposals should ever be revisitable.
- Camera-roll photo suggestion implies new permissions/scope (photo
  library access) not covered by any existing phase — flag this
  explicitly when Phase 3/4 gets a real spec.
- No filtering in v1 was a deliberate YAGNI call, not an oversight — the
  1/day cap is what keeps the feed short enough not to need it yet.
