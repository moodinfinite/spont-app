'use client'

import { useEffect, useState } from 'react'

type ScheduleEvent = {
  start: string
  end: string
  title: string | null
  categoryName: string
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 7)
  return d
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function ScheduleClient() {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    now.setDate(now.getDate() + weekOffset * 7)
    const start = startOfWeek(now)
    const end = endOfWeek(now)

    setLoading(true)
    fetch(`/api/schedule?start=${start.toISOString()}&end=${end.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events ?? [])
        setLoading(false)
      })
  }, [weekOffset])

  return (
    <main>
      <h1>My Schedule</h1>
      <div>
        <button onClick={() => setWeekOffset((w) => w - 1)}>Previous week</button>
        <button onClick={() => setWeekOffset(0)}>This week</button>
        <button onClick={() => setWeekOffset((w) => w + 1)}>Next week</button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : events.length === 0 ? (
        <p>No events this week.</p>
      ) : (
        <ul>
          {events.map((e, i) => (
            <li key={i}>
              <strong>{formatDate(e.start)}</strong>{' '}
              {formatTime(e.start)} – {formatTime(e.end)}{' '}
              | {e.title ?? 'Untitled'}{' '}
              <span>[{e.categoryName}]</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
