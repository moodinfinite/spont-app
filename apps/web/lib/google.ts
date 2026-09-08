import crypto from 'node:crypto'

/**
 * Google OAuth, kept to what Spont actually needs.
 *
 * Signing up *is* connecting your calendar — there's no separate account
 * step, no password. Setup: docs/setup-google-calendar.md
 */

/**
 * `openid` and `email` are here because the two calendar scopes tell us
 * nothing about who is signing in. `profile` gets us a display name, so
 * people aren't greeted by their email address.
 *
 * The calendar pair is deliberately narrow: read *when* someone is busy, and
 * write only to a calendar Spont itself creates. Neither grants access to
 * existing event details, which is what makes the app's privacy line true by
 * construction rather than by policy.
 */
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events.freebusy',
  'https://www.googleapis.com/auth/calendar.app.created',
]

export const STATE_COOKIE = 'spont_oauth_state'

export interface GoogleConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/**
 * Null when the app hasn't been given credentials yet — the caller shows a
 * useful message instead of a broken redirect.
 */
export function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) return null
  return { clientId, clientSecret, redirectUri }
}

export function newState(): string {
  return crypto.randomBytes(16).toString('hex')
}

export function authorizeUrl(config: GoogleConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    state,
    // Google only hands over a refresh token on the first consent unless we
    // ask for it explicitly, and without one Spont can't read a calendar
    // after the first hour.
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export interface GoogleTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
}

export async function exchangeCode(config: GoogleConfig, code: string): Promise<GoogleTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Google rejected the code exchange: ${response.status} ${detail}`)
  }

  const data = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}

export interface GoogleIdentity {
  sub: string
  email: string
  name: string
}

export async function fetchIdentity(accessToken: string): Promise<GoogleIdentity> {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Could not read the Google profile: ${response.status}`)
  }

  const data = (await response.json()) as { sub: string; email?: string; name?: string }
  if (!data.email) {
    throw new Error('Google did not return an email address — is the `email` scope granted?')
  }

  return {
    sub: data.sub,
    email: data.email,
    // Fall back to the local part rather than greeting someone by their
    // full address.
    name: data.name?.trim() || data.email.split('@')[0],
  }
}
