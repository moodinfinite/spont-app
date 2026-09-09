import { NextResponse } from 'next/server'
import { AppError } from '@spont/core'

const STATUS_BY_CODE: Record<string, number> = {
  SELF_FRIEND_REQUEST: 400,
  FRIENDSHIP_EXISTS: 409,
  ALREADY_MEMBER: 409,
  NOT_AUTHORIZED: 403,
  INVALID_STATE: 400,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
}

export function toErrorResponse(err: unknown) {
  if (err instanceof AppError) {
    const status = STATUS_BY_CODE[err.code] ?? 400
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status })
  }
  console.error(err)
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
    { status: 500 },
  )
}
