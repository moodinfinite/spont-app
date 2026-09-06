import { NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { getVisibilitySettings } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'

export async function GET() {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const categories = await prisma.category.findMany({ orderBy: { displayOrder: 'asc' } })
  const visibility = await getVisibilitySettings(prisma, userId)
  return NextResponse.json({ categories, visibility })
}
