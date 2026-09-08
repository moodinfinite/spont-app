import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { getCurrentUserId } from '@/lib/session'

const KEYS = new Set([
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

const STATES = new Set(['none', 'yes', 'never'])

export async function PUT(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const body = await request.json().catch(() => null)
  const incoming = body?.hangoutTimes

  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return NextResponse.json(
      { error: { code: 'INVALID', message: 'Expected an object of time preferences' } },
      { status: 400 },
    )
  }

  // Only keys and values we recognise get stored, so a malformed or hostile
  // body can't put arbitrary JSON in the column.
  const clean: Record<string, string> = {}
  for (const [key, value] of Object.entries(incoming)) {
    if (KEYS.has(key) && typeof value === 'string' && STATES.has(value) && value !== 'none') {
      clean[key] = value
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { hangoutTimes: clean, onboardedAt: new Date() },
  })

  return NextResponse.json({ hangoutTimes: clean })
}
