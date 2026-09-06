import { NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { ensureMappings } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'

export async function GET() {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 },
    )
  }

  const mappings = await ensureMappings(prisma, userId)
  return NextResponse.json({ mappings })
}
