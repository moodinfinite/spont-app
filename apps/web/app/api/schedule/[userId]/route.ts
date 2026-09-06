import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import {
  MockCalendarProvider,
  ensureMappings,
  getVisibilitySettings,
  filterEventsForViewer,
  listFriends,
} from '@spont/core'
import { getCurrentUserId } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  const currentUserId = getCurrentUserId()
  if (!currentUserId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const friends = await listFriends(prisma, currentUserId)
  const isFriend = friends.some((f: { id: string }) => f.id === params.userId)
  if (!isFriend) {
    return NextResponse.json(
      { error: { code: 'NOT_AUTHORIZED', message: 'Not friends with this user' } },
      { status: 403 },
    )
  }

  const url = new URL(request.url)
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')
  if (!start || !end) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'start and end query params required' } },
      { status: 400 },
    )
  }

  const account = await prisma.calendarAccount.findFirst({ where: { userId: params.userId } })
  if (!account) {
    return NextResponse.json({ events: [] })
  }

  const provider = new MockCalendarProvider(prisma)
  const blocks = await provider.listBusyBlocks(account.id, {
    start: new Date(start),
    end: new Date(end),
  })

  const mappings = await ensureMappings(prisma, params.userId)
  const visibility = await getVisibilitySettings(prisma, params.userId)
  const viewable = filterEventsForViewer(blocks, mappings as any, visibility as any)

  return NextResponse.json({ events: viewable })
}
