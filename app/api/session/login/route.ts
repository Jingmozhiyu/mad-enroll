import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AUTH_EMAIL_COOKIE, AUTH_TOKEN_COOKIE, AUTH_USER_ID_COOKIE } from '@/lib/auth/session'
import { backendLogin } from '@/lib/server-backend-api'
import type { AuthPayload, ClientSession } from '@/lib/types'

function buildCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  }
}

function toErrorResponse(error: unknown, fallbackMessage: string) {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : 500

  const message =
    error instanceof Error && error.message.trim()
      ? error.message
      : fallbackMessage

  return NextResponse.json({ message }, { status })
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AuthPayload
    const nextSession = await backendLogin(payload)
    const store = await cookies()
    const cookieOptions = buildCookieOptions()

    store.set(AUTH_TOKEN_COOKIE, nextSession.token, cookieOptions)
    store.set(AUTH_EMAIL_COOKIE, nextSession.email, cookieOptions)
    store.set(AUTH_USER_ID_COOKIE, nextSession.userId, cookieOptions)

    const publicSession: ClientSession = {
      email: nextSession.email,
      userId: nextSession.userId,
    }

    return NextResponse.json(publicSession)
  } catch (error) {
    return toErrorResponse(error, 'Login failed.')
  }
}
