# Home Feed — Design Notes (in progress)

Status: **Paused mid-brainstorm, not yet approved as a spec.** This is a
design target for future phases — nothing here is built yet, and none of
it blocks Phase 1 (foundation), which is being built separately/in
parallel. Treat this as input for whoever writes the Phase 3 (scheduling
engine) and Phase 4 (accept/decline + write-back) specs later, per
`docs/superpowers/specs/2026-09-05-spont-app-foundation-design.md`.

## ⏸ Resume point (paused 2026-09-05)

**Last agreed step, not yet built:** photo-forward card treatment. The
user confirmed the plan in the "In progress — photo-forward cards"
section below (photo scope = decorative cover photo only, direction =
blend photo-forward cards with calm existing chrome, palette/type
unchanged, only borrow floating-pill chips + a signature shape mark).
**Nothing in the mockup file reflects this yet** — the published/local
mockup still has the pre-photo-card version (nav trim + hierarchy fixes
applied, photo cards not applied).

To resume: build the two-state card (default vs. photo-band) described
under "Planned card structure" below into
`docs/superpowers/mockups/2026-09-05-home-feed-mockup.html`, apply it to
Bob's 1:1 card and the Trivia Crew group card, then republish the
artifact (same file path — republishing keeps the same URL:
https://claude.ai/code/artifact/045f709f-2218-4cfb-9ed8-fccb9bc709b8).
No open questions are blocking this — it was ready to build when paused.

Live mockup (latest published): https://claude.ai/code/artifact/045f709f-2218-4cfb-9ed8-fccb9bc709b8
Local copy: `docs/superpowers/mockups/2026-09-05-home-feed-mockup.html`

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
  feed at roughly 30 cards max, realistically far fewer. Grouped under
  month headers (mostly "this month," occasionally rolling into next).
- **Filtering — none in v1.** YAGNI; revisit once real usage shows what
  people actually want to narrow down.
- **Card contents** — who, when, duration, and (system cards only) a short
  reason line ("You haven't hung out in 19 days"). Explicitly **no**
  category/activity type and **no** location — neither exists in the
  current data model and both were cut in brainstorming.
- **Post-decision state** — approving moves the card out of the pending
  feed and into a persistent "Upcoming" section lower on the page (not a
  vanish-and-forget). Declining just removes the card, no residue.
- **Calendar disclosure** — a popup (not a persistent banner) explains
  that suggestions come from Google Calendar free/busy status only, never
  event details, and that accepting is instant/independent. Auto-shows
  once per page load, dismissible (click outside, X, or Escape). No
  persistent way to reopen it — once dismissed, it's gone.

## Navigation

Trimmed to **Home / Friends / Groups** only. Notifications moved to a
bell icon (with unread dot) that opens a dropdown preview + "See all"
link. Settings moved into a profile-avatar dropdown alongside Log out.
Reason: reduce top-level nav surface area so the feed itself (and its
approve/deny buttons) stays the visual focus.

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

## Visual system

- **Palette** — cool grey-blue background (deliberately not the
  cream+terracotta combo that reads as generic/AI-templated). Warm coral
  = human-initiated (brand, friend-invite border, buttons). Cool
  slate-blue = system-generated (suggestion border, reason box).
  Approve/deny get their own green/muted-clay colors, separate from the
  brand accent — deny is muted clay, not alarm red, since declining is a
  normal low-stakes action, not an error.
- **Type** — three faces, one job each: Fraunces (display: wordmark,
  headlines, month divider), Public Sans (UI/body), Space Mono (data:
  date badges, duration pills, upcoming-list dates). Deliberately avoided
  Inter/Space Grotesk as the "safe default" combo.
- **Copy voice** — buttons say "I'm in" / "Not this time," not
  "Approve"/"Deny" — reads like a friend, not a workflow tool.

## In progress — photo-forward cards

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

Planned card structure (not yet built into the mockup file):
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

**Not yet implemented in the published mockup** — next step is to build
this into the HTML and republish.

## Open threads for whoever picks this up next

- The friend-decline-vanishes vs. group-decline-persists asymmetry
  (noted in the foundation plan) will eventually surface here too —
  worth deciding if declined proposals should ever be revisitable.
- Camera-roll photo suggestion implies new permissions/scope (photo
  library access) not covered by any existing phase — flag this
  explicitly when Phase 3/4 gets a real spec.
- No filtering in v1 was a deliberate YAGNI call, not an oversight — the
  1/day cap is what keeps the feed short enough not to need it yet.
