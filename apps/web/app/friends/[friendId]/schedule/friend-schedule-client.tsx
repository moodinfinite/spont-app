'use client'

import { useEffect, useState } from 'react'

type ViewableEvent = {
  start: string
  end: string
  label: string | null
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

export function FriendScheduleClient({
  friendId,
  friendName,
}: {
  friendId: string
  friendName: string
}) {
  const [events, setEvents] = useState<ViewableEvent[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    now.setDate(now.getDate() + weekOffset * 7)
    const start = startOfWeek(now)
    const end = endOfWeek(now)

    setLoading(true)
    setError(null)
    fetch(`/api/schedule/${friendId}?start=${start.toISOString()}&end=${end.toISOString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          setError(body?.error?.message ?? 'Something went wrong')
          setLoading(false)
          return
        }
        const data = await res.json()
        setEvents(data.events ?? [])
        setLoading(false)
      })
  }, [weekOffset, friendId])

  return (
    <main>
      <h1>{friendName}&apos;s Schedule</h1>
      <div>
        <button onClick={() => setWeekOffset((w) => w - 1)}>Previous week</button>
        <button onClick={() => setWeekOffset(0)}>This week</button>
        <button onClick={() => setWeekOffset((w) => w + 1)}>Next week</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
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
              | {e.label ?? 'Busy'}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
