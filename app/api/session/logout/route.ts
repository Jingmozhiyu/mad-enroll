import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AUTH_EMAIL_COOKIE, AUTH_TOKEN_COOKIE, AUTH_USER_ID_COOKIE } from '@/lib/auth/session'

export async function POST() {
  const store = await cookies()

  const expiredCookie = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  }

  store.set(AUTH_TOKEN_COOKIE, '', expiredCookie)
  store.set(AUTH_EMAIL_COOKIE, '', expiredCookie)
  store.set(AUTH_USER_ID_COOKIE, '', expiredCookie)

  return NextResponse.json({ ok: true })
}
