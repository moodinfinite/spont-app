'use client'

import { useEffect, useRef, useState } from 'react'
import type { DayView } from '@/lib/availability'

/**
 * The empty feed, showing the engine looking rather than asserting it works.
 *
 * A line sweeps one day at a time; where it crosses a gap long enough to hold
 * a hangout, that gap lights green and stays lit. Sequential on purpose —
 * sweeping all seven at once reads as decoration, one at a time reads as
 * searching.
 *
 * It runs once and stops. The payoff is the lit week you can read, so looping
 * would spend most of the time un-lighting it — the animation would become
 * something you had to catch rather than a screen you can use.
 *
 * Design: docs/superpowers/mockups/2026-09-08-empty-state-scanning.html
 */

const SWEEP_MS = 900
const STEP_MS = 1000

export function WeekScan({ days }: { days: DayView[] }) {
  const [scanning, setScanning] = useState<number | null>(null)
  const [found, setFound] = useState<Set<number>>(new Set())
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const openings = new Set(days.map((d, i) => (d.open ? i : -1)).filter((i) => i >= 0))

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Land straight on the end state: a readable week, no motion.
      setFound(openings)
      return
    }

    const running: ReturnType<typeof setTimeout>[] = []
    timers.current = running
    const later = (fn: () => void, ms: number) => {
      running.push(setTimeout(fn, ms))
    }

    days.forEach((day, i) => {
      later(() => {
        setScanning(i)
        later(() => setScanning((current) => (current === i ? null : current)), SWEEP_MS)
      }, i * STEP_MS)

      // Light the opening as the line passes over it, not before.
      if (day.open) {
        later(
          () => setFound((prev) => new Set(prev).add(i)),
          i * STEP_MS + SWEEP_MS * (day.open.left / 100),
        )
      }
    })

    return () => {
      running.forEach(clearTimeout)
      timers.current = []
    }
  }, [days])

  return (
    <div className="week">
      {days.map((day, i) => (
        <div className={`day${scanning === i ? ' is-scanning' : ''}`} key={day.label + i}>
          <span className="day-name">{day.label}</span>
          <span className="track">
            {day.busy.map((b, n) => (
              <span className="busy" key={n} style={{ left: `${b.left}%`, width: `${b.width}%` }} />
            ))}
            {day.open && (
              <span
                className={`open${found.has(i) ? ' found' : ''}`}
                style={{ left: `${day.open.left}%`, width: `${day.open.width}%` }}
              />
            )}
            <span className="scan" />
          </span>
        </div>
      ))}
    </div>
  )
}
