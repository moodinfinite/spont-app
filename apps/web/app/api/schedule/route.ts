import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { MockCalendarProvider, ensureMappings } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'

export async function GET(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
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

  const account = await prisma.calendarAccount.findFirst({ where: { userId } })
  if (!account) {
    return NextResponse.json({ events: [] })
  }

  const provider = new MockCalendarProvider(prisma)
  const blocks = await provider.listBusyBlocks(account.id, {
    start: new Date(start),
    end: new Date(end),
  })

  const mappings = await ensureMappings(prisma, userId)
  const mappingByLabel = new Map(mappings.map((m: { rawLabel: string }) => [m.rawLabel, m]))

  const events = (blocks as any[]).map((b) => {
    const mapping = b.rawLabel ? mappingByLabel.get(b.rawLabel) : null
    return {
      start: b.start,
      end: b.end,
      title: b.rawLabel,
      categoryName: mapping ? (mapping as any).category?.name ?? 'Other' : 'Other',
    }
  })

  return NextResponse.json({ events })
}
