import { cookies } from 'next/headers'
import crypto from 'node:crypto'

const COOKIE_NAME = 'spont_session'
const SECRET =
  process.env.SESSION_SECRET ??
  (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set in production')
    }
    return 'dev-secret-change-me'
  })()

function sign(userId: string): string {
  const hmac = crypto.createHmac('sha256', SECRET).update(userId).digest('hex')
  return `${userId}.${hmac}`
}

function verify(value: string): string | null {
  const [userId, hmac] = value.split('.')
  if (!userId || !hmac) return null
  const expected = crypto.createHmac('sha256', SECRET).update(userId).digest('hex')
  return hmac === expected ? userId : null
}

export function setSessionCookie(userId: string): void {
  cookies().set(COOKIE_NAME, sign(userId), { httpOnly: true, sameSite: 'lax', path: '/' })
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME)
}

export function getCurrentUserId(): string | null {
  const value = cookies().get(COOKIE_NAME)?.value
  if (!value) return null
  return verify(value)
}
