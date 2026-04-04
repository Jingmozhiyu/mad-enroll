import { NextResponse } from 'next/server'
import { backendRegister } from '@/lib/server-backend-api'
import type { AuthPayload } from '@/lib/types'

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
    await backendRegister(payload)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return toErrorResponse(error, 'Register failed.')
  }
}
