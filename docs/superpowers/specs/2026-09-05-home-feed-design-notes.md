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

**Since then (2026-09-06):** the visual system was rebuilt around wine
red and a poster/riso sensibility — see "Visual system" below. The
corner notch was dropped. Copy voice is unchanged: buttons still say
"I'm in" / "Not this time," not "Approve"/"Deny."

**Next open design question:** edge and empty states. With a
one-proposal-per-day cap, an empty or near-empty feed is a state people
hit constantly, and nothing covers it yet.

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

## Visual system (revised 2026-09-06 — wine red / poster direction)

Superseded the earlier cool-grey + coral system. Driven by an AMBUSH
poster reference: a flooded red field, oversized soft display type in
bone, a high-contrast black figure printed over the color, riso grain,
hard edges, and a small letterspaced mono wordmark.

Three decisions were made explicitly before the reference arrived, and
all three still hold:

- **Typefaces — sans + mono, plus one display face.** Public Sans (UI and
  body) and Space Mono (data: dates, durations, wordmark, eyebrows).
  Fraunces was cut. The reference then forced a third face back in:
  **Fredoka 600** as the display voice, and only that — oversized
  headlines, month bands, and the modal headline. Its whole identity is
  the display type, so applying the reference without a display face
  wasn't possible. Each face has exactly one job.
- **Weights — two.** 400 and 600, nothing else. Fredoka and Space Mono
  are each loaded at a single weight. Hierarchy comes from size, the
  wine field, and space — not from weight.
- **Color — one hue.** Wine red `#7B1E2B` is the only chromatic color in
  the app. Green/approve, clay/deny, slate/system, and the four avatar
  hues were all removed. Ink and bone carry everything else.

How the palette works:

- **Wine floods, it doesn't accent.** Month dividers are full-bleed wine
  bands. Photo cards are a wine field, not a photograph. The primary
  button is a solid wine block. Wine is the app's voice, at three
  different scales.
- **Bone `#F6F1E6` is what prints on wine**; near-black ink `#17120F` is
  what prints on paper. Page ground is a warm paper `#EBE4D6`, cards a
  lighter `#F7F3EA`.
- **Grain everywhere.** A fine SVG turbulence layer sits over the whole
  page at 5.5% and over every wine field at 30% in `overlay` blend, for
  the riso/newsprint texture the reference has.
- **Hard edges.** Card and button radii dropped from 12px/10px to 3px,
  and card shadows removed entirely. Printed, not floating.
- **Type/decline distinction survives without a second hue.** Friend
  cards keep a solid wine left border; system-suggested cards get a
  dashed near-neutral one, which reads as a perforated ticket edge and
  suits the print theme. Decline is a plain outline button.

Known constraint: **Fredoka's uppercase I and V fuse at tight tracking**
— "TRIVIA" read as "TRMIA". Display headlines carry `letter-spacing:
0.055em` and month bands `0.06em` to separate them, which also matches
the reference's own letterspaced caps. Do not tighten these below ~0.05em.

The corner-notch signature mark was **removed**. It came from the earlier
poster reference and read as a colored blob dropped on the artwork; the
flooded wine field is now the signature device instead.

Photo cards follow the reference's composition directly: black figure
cutouts anchored right, oversized bone display type occupying the left
70%, a wine-deep gradient behind the type for contrast, and a floating
bone date chip. The figures are illustrated silhouettes standing in for
a real user-attached photo — a real photo would need the same
high-contrast monochrome treatment to sit on the wine field.

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

- The friend-decline-vanishes vs. group-decline-persists asymmetry
  (noted in the foundation plan) will eventually surface here too —
  worth deciding if declined proposals should ever be revisitable.
- Camera-roll photo suggestion implies new permissions/scope (photo
  library access) not covered by any existing phase — flag this
  explicitly when Phase 3/4 gets a real spec.
- No filtering in v1 was a deliberate YAGNI call, not an oversight — the
  1/day cap is what keeps the feed short enough not to need it yet.
