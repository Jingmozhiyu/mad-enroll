import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AUTH_EMAIL_COOKIE, AUTH_TOKEN_COOKIE, AUTH_USER_ID_COOKIE } from '@/lib/auth/session'
import type { ClientSession } from '@/lib/types'

export async function GET() {
  const store = await cookies()
  const token = store.get(AUTH_TOKEN_COOKIE)?.value
  const email = store.get(AUTH_EMAIL_COOKIE)?.value
  const userId = store.get(AUTH_USER_ID_COOKIE)?.value

  const session: ClientSession | null =
    token && email && userId ? { email, userId } : null

  return NextResponse.json(session)
}
