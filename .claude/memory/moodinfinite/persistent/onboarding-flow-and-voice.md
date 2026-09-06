# First-run flow and product voice (2026-09-06)

The welcome → connecting → connected flow, and the copy decisions behind
it. Same session as [[home-feed-visual-direction]].

## The mission statement

This is the app's thesis, workshopped from a technical disclosure popup
into something that leads with why Spont exists:

> **See your friends more.**
>
> Spont finds when you and your friends are free, turning "we should
> hang out sometime" into an actual hangout.
>
> Our goal is simple: less time on the app, more time with your friends.

Set large and **not bold** (Sora 400, 42px), body copy in one weight and
one color. Call to action: **"Connect your calendar."**

The line it replaced explained free/busy mechanics first and read like a
feature spec. The mechanics survive as one quiet line under the button —
"We only ever see free or busy, never what's actually on your calendar" —
placed there deliberately: it's the moment someone decides whether to
hand over calendar access.

## Screen treatment

- **The accent green is the entire ground here**, and only here. It's
  the one screen where green is the surface rather than the action
  color. Dark mode drops it to `#96C927` so it isn't a flashlight at
  night.
- **Connecting screen** cycles five taglines, a hairline progress bar
  fills across the sequence, then the two Spont circles converge into a
  check — "Calendar connected. / Finding your first hangouts…"

## The five taglines

1. "Sometime" is looking like Thursday.
2. Less "when are you free?" More "see you there."
3. Your next hangout is hiding in your calendar.
4. Make room for your favorite people.
5. Good friends. Complicated calendars. We can help.

**Motion: rise & fade.** Split-flap was built and tried on the real
screen, then reverted — it's still in the study file if anyone wants to
revisit it.

**Unresolved and worth solving:** a real calendar connect takes about a
second; five lines at ~2.3s each is eleven. Either the screen holds
longer than the work needs, or only one or two lines are ever read. The
"Stack" treatment in the kinetic study is the one option that dissolves
this, by letting all five coexist instead of running in sequence.

## Motion studies produced

Three comparison sheets, all live and looping, in
`docs/superpowers/mockups/`:

- `2026-09-06-connect-text-motion-study.html` — six text treatments
  (rise & fade, word by word, blur focus, slot roll, wipe, typed).
- `2026-09-06-kinetic-type-study.html` — eight more at the artistic end
  (decode, split-flap, tracking collapse, overprint, scatter, slit scan,
  weight bloom, stack).
- `2026-09-06-sync-motion-study.html` — six abstract loading marks
  (overlap, grid scan, slot align, phase lock, ripple, weave).

## Voice

Unchanged from the earlier system and worth holding: plain and human,
never administrative. "I'm in" / "Not this time", not "Approve"/"Deny".
