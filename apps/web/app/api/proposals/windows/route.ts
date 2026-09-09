import { NextRequest, NextResponse } from 'next/server'
import { AppError } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'
import { windowsWith } from '@/lib/propose'

/**
 * When could this set of people actually meet.
 *
 * A POST despite reading nothing back: it takes a list of people and reads
 * several calendars through Google, which is neither cacheable nor something
 * to put in a query string.
 */
export async function POST(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  try {
    const { userIds } = await request.json()
    if (!Array.isArray(userIds) || userIds.some((id) => typeof id !== 'string')) {
      throw new AppError('INVALID_STATE', 'Pick who you want to see')
    }
    if (userIds.length === 0) {
      throw new AppError('INVALID_STATE', 'Pick at least one person')
    }

    const windows = await windowsWith(userId, userIds)
    return NextResponse.json({
      windows: windows.map((w) => ({
        startsAt: w.start.toISOString(),
        endsAt: w.end.toISOString(),
        wanted: w.wanted,
      })),
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
