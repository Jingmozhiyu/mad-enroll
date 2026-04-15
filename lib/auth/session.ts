import 'server-only'

import { cookies } from 'next/headers'
import type { UserSession } from '@/lib/types'

export const AUTH_TOKEN_COOKIE = 'madenroll_auth_token'
export const AUTH_EMAIL_COOKIE = 'madenroll_auth_email'
export const AUTH_USER_ID_COOKIE = 'madenroll_auth_user_id'

type CookieStore = Awaited<ReturnType<typeof cookies>>

export function buildAuthCookieOptions(maxAge = 60 * 60 * 24 * 14) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}

export function setAuthSessionCookies(store: CookieStore, session: UserSession) {
  const cookieOptions = buildAuthCookieOptions()

  store.set(AUTH_TOKEN_COOKIE, session.token, cookieOptions)
  store.set(AUTH_EMAIL_COOKIE, session.email, cookieOptions)
  store.set(AUTH_USER_ID_COOKIE, session.userId, cookieOptions)
}

export function clearAuthSessionCookies(store: CookieStore) {
  const expiredCookie = buildAuthCookieOptions(0)

  store.set(AUTH_TOKEN_COOKIE, '', expiredCookie)
  store.set(AUTH_EMAIL_COOKIE, '', expiredCookie)
  store.set(AUTH_USER_ID_COOKIE, '', expiredCookie)
}
