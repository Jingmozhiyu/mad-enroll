import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { setAuthSessionCookies } from '@/lib/auth/session'
import { backendLogin } from '@/lib/server-backend-api'
import type { AuthPayload, ClientSession } from '@/lib/types'

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
    setAuthSessionCookies(store, nextSession)

    const publicSession: ClientSession = {
      email: nextSession.email,
      userId: nextSession.userId,
    }

    return NextResponse.json(publicSession)
  } catch (error) {
    return toErrorResponse(error, 'Login failed.')
  }
}
