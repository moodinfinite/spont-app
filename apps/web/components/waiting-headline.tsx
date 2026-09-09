'use client'

import { useEffect, useState } from 'react'

/**
 * The waiting state's headline, cycling slowly.
 *
 * One fixed line on a screen you'll see repeatedly starts reading as a stuck
 * app. These rotate on a slow beat — slow enough that it feels like the app
 * is thinking rather than nagging, and each line says the same true thing a
 * different way: it's working, it's just waiting on other people.
 */
const LINES = [
  'Waiting on your friends.',
  'Your calendar is ready. Theirs isn’t here yet.',
  'Nothing to match against — yet.',
  'Spont is watching for a window.',
  'One more person and this starts working.',
]

/**
 * Long enough to read without the screen feeling restless. Six seconds read
 * as stalled; below about three the lines start competing with each other
 * rather than taking turns.
 */
const HOLD_MS = 4000

/** Crossfade. Faster than the hold, or the gap reads as a blank screen. */
const FADE_MS = 300

export function WaitingHeadline() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % LINES.length)
        setVisible(true)
      }, FADE_MS)
    }, HOLD_MS)

    return () => clearInterval(timer)
  }, [])

  return (
    <h3 className={`waiting-headline${visible ? ' is-on' : ''}`} aria-live="polite">
      {LINES[index]}
    </h3>
  )
}
