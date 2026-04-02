import { NextResponse } from 'next/server'
import { backendSearchCourse } from '@/lib/server-backend-api'
import { getServerSession } from '@/lib/server-session'

function toErrorResponse(error: unknown, fallbackMessage: string) {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
      ? ((error as { status: number }).status)
      : 500

  const message = error instanceof Error ? error.message : fallbackMessage

  return NextResponse.json({ message }, { status })
}

export async function GET(request: Request) {
  const { token } = await getServerSession()
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const courseName = searchParams.get('courseName') ?? ''
    const results = await backendSearchCourse(token, courseName)
    return NextResponse.json(results)
  } catch (error) {
    return toErrorResponse(error, 'Failed to search courses.')
  }
}
