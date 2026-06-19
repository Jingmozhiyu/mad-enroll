import 'server-only'

import { cookies } from 'next/headers'
import { AUTH_EMAIL_COOKIE, AUTH_TOKEN_COOKIE, AUTH_USER_ID_COOKIE } from '@/lib/auth/session'
import type { ClientSession } from '@/lib/types'

export async function getServerSession() {
  const store = await cookies()
  const token = store.get(AUTH_TOKEN_COOKIE)?.value ?? null
  const email = store.get(AUTH_EMAIL_COOKIE)?.value ?? null
  const userId = store.get(AUTH_USER_ID_COOKIE)?.value ?? null

  if (!token || !email || !userId) {
    return {
      token: null,
      session: null as ClientSession | null,
    }
  }

  return {
    token,
    session: { userId, email } satisfies ClientSession,
  }
}
