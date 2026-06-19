import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { clearAuthSessionCookies } from '@/lib/auth/session'

export async function POST() {
  const store = await cookies()
  clearAuthSessionCookies(store)

  return NextResponse.json({ ok: true })
}
