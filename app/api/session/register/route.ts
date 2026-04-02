import { NextResponse } from 'next/server'
import { backendRegister } from '@/lib/server-backend-api'
import type { AuthPayload } from '@/lib/types'

export async function POST(request: Request) {
  const payload = (await request.json()) as AuthPayload
  await backendRegister(payload)
  return NextResponse.json({ ok: true })
}
