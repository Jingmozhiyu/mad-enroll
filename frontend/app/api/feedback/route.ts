import { NextResponse } from 'next/server'
import { backendSubmitFeedback } from '@/lib/server-backend-api'
import { getServerSession } from '@/lib/server-session'
import type { FeedbackPayload } from '@/lib/types'

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
    const { token } = await getServerSession()
    const payload = (await request.json()) as Partial<FeedbackPayload>
    const normalized = {
      message: payload.message?.trim() ?? '',
    }

    if (!normalized.message) {
      return NextResponse.json(
        { message: 'Feedback message is required.' },
        { status: 400 },
      )
    }

    await backendSubmitFeedback(normalized, token ?? undefined)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return toErrorResponse(error, 'Failed to submit feedback.')
  }
}
