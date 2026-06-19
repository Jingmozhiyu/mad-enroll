import { NextResponse } from 'next/server'
import { backendFetchAdminSchedulerStatus } from '@/lib/server-backend-api'
import { getServerSession } from '@/lib/server-session'

function toErrorResponse(error: unknown, fallbackMessage: string) {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : 500

  const message = error instanceof Error ? error.message : fallbackMessage
  return NextResponse.json({ message }, { status })
}

export async function GET() {
  const { token } = await getServerSession()
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await backendFetchAdminSchedulerStatus(token)
    return NextResponse.json(data)
  } catch (error) {
    return toErrorResponse(error, 'Failed to load scheduler status.')
  }
}
