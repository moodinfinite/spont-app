import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@spont/db'
import { createGroup, listGroupsForUser } from '@spont/core'
import { getCurrentUserId } from '@/lib/session'
import { toErrorResponse } from '@/lib/api-error'

export async function GET() {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const groups = await listGroupsForUser(prisma, userId)
  return NextResponse.json({ groups })
}

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }, { status: 401 })
  }

  const { name } = await request.json()
  try {
    const group = await createGroup(prisma, userId, name)
    return NextResponse.json({ group })
  } catch (err) {
    return toErrorResponse(err)
  }
}
