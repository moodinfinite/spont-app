'use client'

import { useState } from 'react'
import { ensurePushSubscription } from '@/lib/push-client'

type Group = { id: string; name: string }

export function PingButton() {
  const [open, setOpen] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState('')
  const [message, setMessage] = useState('')
  const [hours, setHours] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function openCompose() {
    try {
      await ensurePushSubscription()
    } catch (err) {
      console.error('Push subscription failed', err)
    }
    const res = await fetch('/api/groups')
    const data = await res.json()
    setGroups(data.groups)
    setGroupId(data.groups[0]?.id ?? '')
    setOpen(true)
  }

  async function send() {
    setStatus('sending')
    const windowEnd = hours
      ? new Date(Date.now() + Number(hours) * 60 * 60 * 1000).toISOString()
      : undefined

    const res = await fetch('/api/pings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, message: message || undefined, windowEnd }),
    })

    if (res.ok) {
      setOpen(false)
      setMessage('')
      setHours('')
      setStatus('idle')
    } else {
      const data = await res.json()
      setStatus('error')
      setErrorMessage(data.error?.message ?? 'Something went wrong')
    }
  }

  if (!open) {
    return <button onClick={openCompose}>I&apos;m free</button>
  }

  if (groups.length === 0) {
    return (
      <div>
        <p>You need a group first — go to Groups and create one.</p>
        <button onClick={() => setOpen(false)}>Close</button>
      </div>
    )
  }

  return (
    <div>
      <label>
        Group
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Message (optional)
        <input value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      <label>
        Free for how many hours? (optional)
        <input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} />
      </label>
      {status === 'error' && <p>{errorMessage}</p>}
      <button onClick={send} disabled={status === 'sending'}>
        Send
      </button>
      <button onClick={() => setOpen(false)}>Cancel</button>
    </div>
  )
}
