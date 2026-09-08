import { prisma } from '@spont/db'
import { freeWindows, type FreeWindow } from '@spont/core'
import { googleConfig } from './google'

/**
 * Reading a real Google calendar. Deliberately only free/busy — the scopes
 * we hold can't see event details, so there's nothing here to accidentally
 * over-fetch.
 */

interface Busy {
  start: Date
  end: Date
  rawLabel: null
}

/**
 * Access tokens last about an hour. Swap an expired one using the refresh
 * token, and persist the new one so the next request doesn't repeat the work.
 */
async function freshAccessToken(accountId: string): Promise<string | null> {
  const account = await prisma.calendarAccount.findUnique({ where: { id: accountId } })
  if (!account?.accessToken) return null

  const stillGood = account.tokenExpiresAt && account.tokenExpiresAt.getTime() > Date.now() + 60_000
  if (stillGood) return account.accessToken

  const config = googleConfig()
  if (!config || !account.refreshToken) return null

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: account.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    // Most likely the refresh token expired — testing-mode apps get about a
    // week. The caller treats this as "no availability" rather than crashing.
    console.error('Could not refresh the Google token', await response.text())
    return null
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  await prisma.calendarAccount.update({
    where: { id: accountId },
    data: {
      accessToken: data.access_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  })
  return data.access_token
}

export async function fetchBusy(
  accountId: string,
  start: Date,
  end: Date,
): Promise<Busy[] | null> {
  const token = await freshAccessToken(accountId)
  if (!token) return null

  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      items: [{ id: 'primary' }],
    }),
  })

  if (!response.ok) {
    console.error('freeBusy failed', response.status, await response.text())
    return null
  }

  const data = (await response.json()) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>
  }

  const busy = data.calendars?.primary?.busy ?? []
  return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end), rawLabel: null }))
}

export interface Opening extends FreeWindow {
  /** Length in minutes, so the caller doesn't recompute it. */
  minutes: number
}

/**
 * Windows this person could plausibly see someone in, over the next `days`.
 *
 * Sleep is carved out by only counting time between 8am and 11pm — without
 * that, "you're free" includes 3am and the answer is useless. Local time is
 * the server's for now; per-user timezones are a real gap once testers aren't
 * all in one place.
 */
export async function findOpenings(
  accountId: string,
  options: { days?: number; minMinutes?: number; limit?: number } = {},
): Promise<Opening[] | null> {
  const days = options.days ?? 30
  const minMinutes = options.minMinutes ?? 120
  const limit = options.limit ?? 4

  const start = new Date()
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000)

  const busy = await fetchBusy(accountId, start, end)
  if (busy === null) return null

  const openings: Opening[] = []

  for (let day = 0; day < days && openings.length < limit; day++) {
    const dayStart = new Date(start)
    dayStart.setDate(dayStart.getDate() + day)
    dayStart.setHours(8, 0, 0, 0)

    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 0, 0, 0)

    // Don't offer a window that has already begun.
    if (dayEnd <= start) continue
    const from = dayStart < start ? start : dayStart

    for (const window of freeWindows(busy, { start: from, end: dayEnd })) {
      const minutes = (window.end.getTime() - window.start.getTime()) / 60000
      if (minutes < minMinutes) continue
      openings.push({ ...window, minutes })
      break // one per day, so a quiet week doesn't read as a wall of slots
    }
  }

  return openings.slice(0, limit)
}
