import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { getCurrentUserId } from '@/lib/session'

/**
 * Everything Settings can change, in one place. Each field is validated
 * against a fixed set rather than trusted, so a malformed or hostile body
 * can't write arbitrary values.
 */

const TIME_KEYS = new Set([
  'wd-before',
  'wd-lunch',
  'wd-after',
  'wd-evening',
  'wd-late',
  'we-morning',
  'we-midday',
  'we-afternoon',
  'we-evening',
  'we-late',
])

const TIME_STATES = new Set(['yes', 'never'])
const HANGOUT_MINUTES = new Set([60, 90, 120, 180])
const BUFFER_MINUTES = new Set([0, 30, 60, 90])
const WINDOW_PREFERENCE = new Set(['SOONEST', 'BEST'])

export async function PUT(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: { code: 'INVALID', message: 'Expected an object' } },
      { status: 400 },
    )
  }

  const data: Record<string, unknown> = {}

  if (body.hangoutTimes && typeof body.hangoutTimes === 'object' && !Array.isArray(body.hangoutTimes)) {
    const clean: Record<string, string> = {}
    for (const [key, value] of Object.entries(body.hangoutTimes)) {
      if (TIME_KEYS.has(key) && typeof value === 'string' && TIME_STATES.has(value)) {
        clean[key] = value
      }
    }
    data.hangoutTimes = clean
    // Answering this is the last thing onboarding asks.
    data.onboardedAt = new Date()
  }

  if (HANGOUT_MINUTES.has(body.preferredHangoutMinutes)) {
    data.preferredHangoutMinutes = body.preferredHangoutMinutes
  }
  if (BUFFER_MINUTES.has(body.bufferMinutes)) {
    data.bufferMinutes = body.bufferMinutes
  }
  if (WINDOW_PREFERENCE.has(body.windowPreference)) {
    data.windowPreference = body.windowPreference
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: { code: 'INVALID', message: 'Nothing recognised to update' } },
      { status: 400 },
    )
  }

  const user = await prisma.user.update({ where: { id: userId }, data })

  return NextResponse.json({
    hangoutTimes: user.hangoutTimes,
    preferredHangoutMinutes: user.preferredHangoutMinutes,
    bufferMinutes: user.bufferMinutes,
    windowPreference: user.windowPreference,
  })
}
