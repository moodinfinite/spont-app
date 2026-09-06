import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { overrideMapping, resetMapping } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function PUT(
  request: NextRequest,
  { params }: { params: { rawLabel: string } },
) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const { categoryId } = await request.json()
  const rawLabel = decodeURIComponent(params.rawLabel)
  try {
    const mapping = await overrideMapping(prisma, userId, rawLabel, categoryId)
    return NextResponse.json({ mapping })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { rawLabel: string } },
) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const rawLabel = decodeURIComponent(params.rawLabel)
  try {
    const mapping = await resetMapping(prisma, userId, rawLabel)
    return NextResponse.json({ mapping })
  } catch (err) {
    return toErrorResponse(err)
  }
}
