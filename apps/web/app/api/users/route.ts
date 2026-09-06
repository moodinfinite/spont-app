import { NextResponse } from 'next/server'
import { prisma } from '@spont/db'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 })
  }
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json({ users })
}
