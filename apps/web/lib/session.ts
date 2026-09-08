import { cookies } from 'next/headers'
import crypto from 'node:crypto'

const COOKIE_NAME = 'spont_session'

/** Sessions age out rather than lasting forever. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const SECRET =
  process.env.SESSION_SECRET ??
  (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set in production')
    }
    return 'dev-secret-change-me'
  })()

/**
 * The signed payload carries when it was issued, so a cookie can expire.
 * Signing the user id alone produced a token that was valid forever and
 * couldn't be aged out or revoked — a leaked cookie would have been
 * permanent access.
 */
function sign(userId: string, issuedAt: number): string {
  const payload = `${userId}.${issuedAt}`
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${hmac}`
}

/** Constant-time, so a wrong signature doesn't leak how wrong it was. */
function matches(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function verify(value: string): string | null {
  const parts = value.split('.')
  if (parts.length !== 3) return null
  const [userId, issuedAtRaw, hmac] = parts
  if (!userId || !issuedAtRaw || !hmac) return null

  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(`${userId}.${issuedAtRaw}`)
    .digest('hex')
  if (!matches(hmac, expected)) return null

  const issuedAt = Number(issuedAtRaw)
  if (!Number.isFinite(issuedAt)) return null
  if (Date.now() - issuedAt > MAX_AGE_SECONDS * 1000) return null

  return userId
}

export function setSessionCookie(userId: string): void {
  cookies().set(COOKIE_NAME, sign(userId, Date.now()), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Deployed over TLS, so the cookie must never travel in the clear.
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME)
}

export function getCurrentUserId(): string | null {
  const value = cookies().get(COOKIE_NAME)?.value
  if (!value) return null
  return verify(value)
}
