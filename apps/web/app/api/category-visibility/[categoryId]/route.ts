import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { updateVisibility } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function PUT(
  request: NextRequest,
  { params }: { params: { categoryId: string } },
) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const { displayMode } = await request.json()
  try {
    const result = await updateVisibility(prisma, userId, params.categoryId, displayMode)
    return NextResponse.json({ visibility: result })
  } catch (err) {
    return toErrorResponse(err)
  }
}
