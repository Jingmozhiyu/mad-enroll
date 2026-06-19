import { NextResponse } from 'next/server'
import { backendSearchCourses } from '@/lib/server-backend-api'
import {
  COURSE_SEARCH_FAILURE_MESSAGE,
  COURSE_SEARCH_NOT_FOUND_MESSAGE,
  getCourseSearchValidationMessage,
  normalizeCourseSearchErrorMessage,
  normalizeCourseSearchQuery,
} from '@/lib/course-search'
import { resolveTaskSearchTermId } from '@/lib/server-task-search-terms'
import { getServerSession } from '@/lib/server-session'

function toErrorResponse(error: unknown, fallbackMessage: string) {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : 500

  const message = normalizeCourseSearchErrorMessage(error, fallbackMessage)
  const nextStatus =
    message === COURSE_SEARCH_NOT_FOUND_MESSAGE
      ? 404
      : status >= 500
        ? 500
        : status

  return NextResponse.json({ message }, { status: nextStatus })
}

export async function GET(request: Request) {
  const { token } = await getServerSession()
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const courseName = normalizeCourseSearchQuery(searchParams.get('courseName') ?? '')
    const termId =
      searchParams.get('termId') ?? resolveTaskSearchTermId(searchParams.get('termKey'))
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
    const validationMessage = getCourseSearchValidationMessage(courseName)

    if (validationMessage) {
      return NextResponse.json({ message: validationMessage }, { status: 400 })
    }

    const results = await backendSearchCourses(token, courseName, termId, page)
    return NextResponse.json(results)
  } catch (error) {
    return toErrorResponse(error, COURSE_SEARCH_FAILURE_MESSAGE)
  }
}
